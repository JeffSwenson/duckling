import {Graphics, Container, DisplayObject} from 'pixi.js';

import {getPosition} from '../position/position-attribute';
import {Entity} from '../../entitysystem/entity';
import {Vector, degreesToRadians} from '../../math';
import {drawEllipse, drawRectangle, rgbToHex} from '../../canvas/drawing/util';

import {DrawableAttribute, getDrawableAttribute} from './drawable-attribute';
import {Drawable, DrawableType} from './drawable';
import {ShapeDrawable} from './shape-drawable';
import {ContainerDrawable} from './container-drawable';
import {ShapeType, Shape} from './shape';
import {Circle} from './circle';
import {Rectangle} from './rectangle';

/**
 * Draws the drawable and bounds of the drawable for a DrawableAttribute
 * @param  entity The entity with the drawable attribute
 * @return DisplayObject that contains the drawn DrawableAttribute
 */
export function drawDrawableAttribute(entity : Entity) : DisplayObject {
    var positionAttribute = getPosition(entity);
    var drawableAttribute = getDrawableAttribute(entity);
    if (!positionAttribute || !drawableAttribute.topDrawable) {
        return null;
    }

    var container = new Container();
    var drawable = new DisplayObject();
    drawable = drawDrawable(drawableAttribute.topDrawable);
    container.addChild(drawable);
    drawable.updateTransform();
    container.addChild(drawDrawableBounds(drawable.getBounds(), drawableAttribute.topDrawable));
    container.position.x = positionAttribute.position.x;
    container.position.y = positionAttribute.position.y;
    return container;
}

function drawDrawable(drawable : Drawable) : DisplayObject {
    if (drawable.inactive) {
        return new DisplayObject();
    }

    var drawableContainer = new Container();
    switch (drawable.type) {
        case DrawableType.Shape:
            drawableContainer.addChild(drawShapeDrawable(drawable as ShapeDrawable));
        case DrawableType.Container:
            drawableContainer.addChild(drawContainerDrawable(drawable as ContainerDrawable));
    }
    applyDrawableProperties(drawable, drawableContainer);
    return drawableContainer;
}

function drawDrawableBounds(bounds: PIXI.Rectangle, drawable : Drawable) : DisplayObject {
    var graphics = new Graphics();
    drawable.bounds = {
        x: bounds.width,
        y: bounds.height
    }
    graphics.lineStyle(1, 0x000000);
    drawRectangle({x: 0, y: 0}, drawable.bounds, graphics);
    return graphics;
}

function drawShapeDrawable(shapeDrawable : ShapeDrawable) : DisplayObject {
    var graphics = new Graphics();
    var colorHex = rgbToHex(shapeDrawable.shape.fillColor.r, shapeDrawable.shape.fillColor.g, shapeDrawable.shape.fillColor.b);
    graphics.beginFill(parseInt(colorHex, 16), 1);
    graphics.fillAlpha = shapeDrawable.shape.fillColor.a / 255;
    switch (shapeDrawable.shape.type) {
        case ShapeType.Circle:
            var radius = (shapeDrawable.shape as Circle).radius;
            drawEllipse({x: 0, y: 0}, radius, radius, graphics);
            break;
        case ShapeType.Rectangle:
            var dimension = (shapeDrawable.shape as Rectangle).dimension;
            drawRectangle({x: 0, y: 0}, dimension, graphics);
            break;
    }
    graphics.endFill();
    return graphics;
}

function drawContainerDrawable(containerDrawable : ContainerDrawable) : DisplayObject {
    if (!containerDrawable.drawables) {
        return new Container();
    }

    var container = new Container();
    containerDrawable.drawables.map((drawable : Drawable) => {
        container.addChild(drawDrawable(drawable));
    });
    return container;
}

function applyDrawableProperties(drawable : Drawable, drawableDisplayObject : DisplayObject) {
    drawableDisplayObject.scale.x = drawable.scale.x;
    drawableDisplayObject.scale.y = drawable.scale.y;
    drawableDisplayObject.rotation = degreesToRadians(drawable.rotation);
}