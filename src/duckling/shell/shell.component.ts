import {Component, Input, ChangeDetectorRef} from 'angular2/core';
import {Entity} from '../entitysystem/entity';
import {EntityComponent} from '../entitysystem/entity.component';
import {SplashComponent} from '../splash/splash.component';
import {NumberInput} from '../controls/number-input.component';

import {BodyType, CollisionType} from '../game/collision/collision-attribute';

@Component({
    selector: 'duckling-shell',
    directives: [
        EntityComponent,
        SplashComponent
    ],
    template: `
        <div *ngIf="!gameLoaded">
            <dk-splash-screen></dk-splash-screen>
        </div>

        <div *ngIf="gameLoaded">
            <h1>This is the Shell</h1>
            <entity-component
                [entity]="entity"
                (entityChanged)="onEntityChanged($event)">
            </entity-component>
            <br />
            <entity-component
                [entity]="entity"
                (entityChanged)="onEntityChanged($event)">
            </entity-component>
        </div>
    `
})
export class ShellComponent {
    @Input() entity : Entity = {
        position: {
            position: {
                x: 0,
                y: 0
            },
            velocity: {
                x: 0,
                y: 0
            }
        },
        collision: {
            dimension: {
                dimension: {
                    x: 0,
                    y: 0
                }
            },
            oneWayNormal: {
                x: 0,
                y: 0
            },
            collisionType: CollisionType.Ground,
            bodyType: BodyType.Environment
        }
    }

    private gameLoaded : boolean = false;

    onEntityChanged(entity : Entity) {
        this.entity = entity;
    }
}
