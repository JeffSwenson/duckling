import {NgModule, Provider} from '@angular/core';

import {ControlsModule} from '../controls/controls.module';
import {ActionComponent} from './action/action.component';
import {CameraComponent} from './camera/camera.component';
import {CollisionComponent} from './collision/collision.component';
import {DrawableComponent} from './drawable/drawable.component';
import {PositionComponent} from './position/position.component';
import {RotateComponent} from './rotate/rotate.component';

import {AnimatedDrawableComponent} from './drawable/animated-drawable.component';
import {ContainerDrawableComponent} from './drawable/container-drawable.component';
import {CircleComponent} from './drawable/circle.component';
import {DrawableAttributeComponent} from './drawable/drawable-attribute.component';
import {GenericDrawableComponent} from './drawable/generic-drawable.component';
import {ImageDrawableComponent} from './drawable/image-drawable.component';
import {RectangleComponent} from './drawable/rectangle.component';
import {ShapeDrawableComponent} from './drawable/shape-drawable.component';
import {GenericShapeComponent} from './drawable/generic-shape.component';

import {
    AttributeDefaultService,
    EntityBoxService,
    EntitySystemService,
    EntityPositionSetService
} from '../entitysystem';
import {AttributeComponentService} from '../entityeditor';
import {EntityDrawerService} from '../canvas/drawing/entity-drawer.service';
import {RequiredAssetService} from '../project';
import {AnconaSFMLRenderPriorityService} from './ancona-sfml-render-priority.service';
import {RenderPriorityService} from '../canvas/drawing/render-priority.service';

import {bootstrapGameComponents} from './index';

const ATTRIBUTE_COMPONENTS = [
        ActionComponent,
        CameraComponent,
        CollisionComponent,
        DrawableAttributeComponent,
        PositionComponent,
        RotateComponent
]

@NgModule({
    imports: [
        ControlsModule
    ],
    declarations: [
        ATTRIBUTE_COMPONENTS,
        AnimatedDrawableComponent,
        ContainerDrawableComponent,
        CircleComponent,
        DrawableComponent,
        GenericDrawableComponent,
        ImageDrawableComponent,
        RectangleComponent,
        ShapeDrawableComponent,
        GenericShapeComponent
    ],
    exports: [
        ATTRIBUTE_COMPONENTS
    ],
    providers: [
        new Provider(RenderPriorityService, {useClass: AnconaSFMLRenderPriorityService})
    ],
    entryComponents: [
        ATTRIBUTE_COMPONENTS
    ]
})
export class GameModule {
    constructor(public attributeDefaultService : AttributeDefaultService,
                public entityPositionSetService : EntityPositionSetService,
                public entityBoxService : EntityBoxService,
                public attributeComponentService : AttributeComponentService,
                public entityDrawerService : EntityDrawerService,
                public requiredAssetService : RequiredAssetService) {
        bootstrapGameComponents(this);
    }
}