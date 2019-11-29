import { expect } from "chai";
import { Map } from "immutable";

import {
    MigrationService,
    VersionFile,
} from "../../duckling/migration/migration.service";
import { PathService } from "../../duckling/util/path.service";
import { ChangeType, changeType } from "../../duckling/state/object-diff";
import { ExistingCodeMigration } from "../../duckling/migration/existing-code-migration";
import { MigrationTools } from "../../duckling/migration/migration-tools";
import { ParsedMap } from "../../duckling/project/map-parser.service";
import {
    EntitySystem,
    Entity,
    EntityKey,
} from "../../duckling/entitysystem/entity";

const MIGRATION_FILE: VersionFile = {
    projectVersion: "1.0",
    editorVersion: "0.1",
    mapMigrations: [
        {
            updateTo: "1.0",
            name: "fake-collision-migration",
            options: {
                oldType: "oldType",
                newType: "newType",
            },
        },
    ],
};

const RAW_MAP: any = {
    version: "0.0",
    systems: {
        collision: {
            components: {
                entity1: {
                    collisionType: "oldType",
                },
            },
        },
    },
};

let fakeCollisionMigration: ExistingCodeMigration = {
    rawMapFunction: (tools: MigrationTools) => {
        return tools.attributeMigration(
            "collision",
            (attribute: any, options: any) => {
                if (attribute.collisionType === options.oldType) {
                    attribute.collisionType = options.newType;
                }
                return attribute;
            }
        );
    },
    entitySystemFunction: (entitySystem: EntitySystem, options?: any) => {
        return entitySystem.map((entity: Entity) => {
            for (let attributeKey in entity) {
                if (attributeKey === "collision") {
                    if (
                        (entity.collision as any).collisionType ===
                        options.oldType
                    ) {
                        (entity[attributeKey] as any).collisionType =
                            options.newType;
                    }
                }
            }
            return entity;
        }) as Map<EntityKey, Entity>;
    },
    name: "fake-collision-migration",
};

describe("MigrationService", function() {
    let migrationService: MigrationService;
    beforeEach(function() {
        migrationService = new MigrationService(new PathService(), null);
        migrationService.registerExistingCodeMigration(fakeCollisionMigration);
    });

    describe("migrateMap", () => {
        it("Runs existing code on a raw map", async function() {
            let map = await migrationService.migrateMap(
                RAW_MAP,
                MIGRATION_FILE,
                "THE_ROOT"
            );
            expect(
                map.systems.collision.components.entity1.collisionType
            ).to.eql("newType");
        });
    });

    describe("updateVersionInfoWithExistingCodeMigration", () => {
        const PRE_MIGRATION_VERSION_INFO: VersionFile = {
            projectVersion: "1.0",
            editorVersion: "0.1",
            mapMigrations: [
                {
                    updateTo: "1.0",
                    name: "migrations/coin-migration",
                },
            ],
        };

        const EXPECTED_VERSION_INFO: VersionFile = {
            projectVersion: "2.0",
            editorVersion: "0.1",
            mapMigrations: [
                {
                    updateTo: "1.0",
                    name: "migrations/coin-migration",
                },
                {
                    updateTo: "2.0",
                    name: "collision",
                    options: {
                        oldType: "oldType",
                        newType: "newType",
                    },
                },
            ],
        };

        let versionInfo: VersionFile;

        beforeEach(() => {
            versionInfo = Object.assign({}, PRE_MIGRATION_VERSION_INFO);
            versionInfo = migrationService.updateVersionInfoWithExistingCodeMigration(
                versionInfo,
                "collision",
                { oldType: "oldType", newType: "newType" }
            );
        });

        describe("the existing-code migration that it adds", () => {
            it("has an 'updateTo' equal to the new project version in the file", () => {
                expect(versionInfo.mapMigrations[1].updateTo).to.eql(
                    EXPECTED_VERSION_INFO.projectVersion
                );
            });

            it("has the options that were provided", () => {
                expect(versionInfo.mapMigrations[1].options).to.eql(
                    (EXPECTED_VERSION_INFO.mapMigrations[1] as any).options
                );
            });
        });

        it("increments the project version", () => {
            expect(versionInfo.projectVersion).to.eql(
                EXPECTED_VERSION_INFO.projectVersion
            );
        });
    });

    // describe("migrateEntitySystem", () => {
    //     let entitySystem: EntitySystem;

    //     const ENTITY_SYSTEM: EntitySystem = Map<EntityKey, Entity>({
    //         entity1: {
    //             collision: {
    //                 collisionType: "oldType",
    //             },
    //         },
    //         entity2: {
    //             drawable: {
    //                 drawableData: "drawableData",
    //             },
    //         },
    //     });

    //     const MIGRATED_ENTITY_SYSTEM: EntitySystem = Map<EntityKey, Entity>({
    //         entity1: {
    //             collision: {
    //                 collisionType: "newType",
    //             },
    //         },
    //         entity2: {
    //             drawable: {
    //                 drawableData: "drawableData",
    //             },
    //         },
    //     });

    //     beforeEach(() => {
    //         entitySystem = Map(ENTITY_SYSTEM);
    //     });

    //     it("throws an error when an unregistered existing-code migration is provided", () => {
    //         expect(() =>
    //             migrationService.migrateEntitySystem(
    //                 entitySystem,
    //                 "invalid-migration",
    //                 {}
    //             )
    //         ).to.throw(Error);
    //     });

    //     it("runs a registered existing code migration", () => {
    //         expect(
    //             migrationService.migrateEntitySystem(
    //                 entitySystem,
    //                 "fake-collision-migration",
    //                 { oldType: "oldType", newType: "newType" }
    //             )
    //         ).to.eql(MIGRATED_ENTITY_SYSTEM);
    //     });
    // });
});
