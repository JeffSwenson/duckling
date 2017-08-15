import { expect } from 'chai';

import { MigrationService, ProjectVersionInfo } from '../../duckling/migration/migration.service';
import { PathService } from '../../duckling/util/path.service';
import { ChangeType, changeType } from '../../duckling/state/object-diff';
import { ExistingCodeMigration } from '../../duckling/migration/existing-code-migration';
import { MigrationTools } from '../../duckling/migration/migration-tools';


const MIGRATION_FILE: ProjectVersionInfo = {
    mapVersion: "1.0",
    mapMigrations: [
        {
            type: "existing-code",
            updateTo: "1.0",
            name: "fake-collision-migration",
            options: {
                oldType: "oldType",
                newType: "newType"
            }
        },
    ]
}

const RAW_MAP: any = {
    version: "0.0",
    systems: {
        collision: {
            components: {
                entity1: {
                    collisionType: "oldType"
                }
            }
        }
    }
}

let fakeCollisionMigration: ExistingCodeMigration = {
    function: (tools: MigrationTools) => {
        return tools.attributeMigration("collision", (attribute: any, options: any) => {
            if (attribute.collisionType === options.oldType) {
                attribute.collisionType = options.newType;
            }
            return attribute;
        });
    },
    name: "fake-collision-migration"
}


describe("MigrationService", function () {
    let migrationService: MigrationService;
    beforeEach(function () {
        migrationService = new MigrationService(new PathService(), null);
        migrationService.addExistingCodeMigration(fakeCollisionMigration);
    });

    it("Runs existing code on a raw map", async function () {
        let map = await migrationService.migrateMap(RAW_MAP, MIGRATION_FILE, "THE_ROOT");
        expect(map.systems.collision.components.entity1.collisionType).to.eql("newType");
    });
});
