import {
    Component,
    Input,
    Output,
    EventEmitter
} from 'angular2/core';

import {VectorInput} from '../../controls/vector-input.component';
import {EnumSelect} from '../../controls/enum-select.component';
import {Vector} from '../../math/vector';
import {immutableAssign} from '../../util/model';
import {CollisionAttribute, BodyType, CollisionType} from './collision-attribute';

/**
 * Implementation that will be registered with the AttributeComponentService.
 * @see AttributeComponentService
 * @see AttributeComponent
 */
@Component({
    selector: "collision-component",
    directives: [VectorInput, EnumSelect],
    styles: [`
        .formLabel {
            color: black;
            padding-top: 20px;
            padding-bottom: 5px;
        }
    `],
    template: `
        <vector-input
            title="Dimension"
            [value]="attribute.dimension.dimension"
            (validInput)="onDimensionInput($event)">
        </vector-input>
        <vector-input
            title="One Way Normal"
            [value]="attribute.oneWayNormal"
            (validInput)="onOneWayNormalInput($event)">
        </vector-input>

        <div class="formLabel">Body Type</div>
        <dk-enum-select
            [value]="attribute.bodyType"
            [enum]="bodyTypes"
            (selection)="onBodyTypeInput($event)">
        </dk-enum-select>

        <div class="formLabel">Collision Type</div>
        <dk-enum-select
            [value]="attribute.collisionType"
            [enum]="collisionType"
            (selection)="onCollisionTypeInput($event)">
        </dk-enum-select>
    `
})
export class CollisionComponent {
    @Input() attribute : CollisionAttribute;
    @Output() attributeChanged: EventEmitter<CollisionAttribute> = new EventEmitter();

    bodyTypes = BodyType;
    collisionType = CollisionType;

    onOneWayNormalInput(oneWayNormal : Vector) {
        this.attributeChanged.emit(immutableAssign(this.attribute, {oneWayNormal}));
    }

    onDimensionInput(dimension : Vector) {
        var newBox = immutableAssign(this.attribute.dimension, {dimension});
        this.attributeChanged.emit(immutableAssign(this.attribute, {dimension: newBox}));
    }

    onBodyTypeInput(bodyType : BodyType) {
        this.attributeChanged.emit(immutableAssign(this.attribute, {bodyType}));
    }

    onCollisionTypeInput(collisionType : CollisionType) {
        this.attributeChanged.emit(immutableAssign(this.attribute, {collisionType}));
    }
}