import { ReflectiveInjector } from "@angular/core";

import {
    RenderTexture,
    Texture,
    Sprite,
    Graphics,
    DisplayObject,
    Container,
    BaseTexture,
    Point,
    Text,
    TilingSprite
} from "pixi.js";
import * as PIXI from "pixi.js";

import { AssetService } from "../../project";
import { Entity } from "../../entitysystem/entity";
import { Vector, degreesToRadians } from "../../math";
import { Box2 } from "../../math/box2";
import { immutableAssign } from "../../util/model";
import { drawMissingAsset } from "../../canvas/drawing/util";
import {
    DrawnConstruct,
    TransformProperties,
} from "../../canvas/drawing/drawn-construct";
import { drawEllipse, drawRectangle } from "../../canvas/drawing/util";
import { colorToHex } from "../../canvas/drawing/color";
import { AttributeDrawer } from "../../canvas/drawing/entity-drawer.service";

import { DrawableAttribute, getDrawableAttribute } from "./drawable-attribute";
import { Drawable, DrawableType } from "./drawable";
import { cppTypeToDrawableType } from "./drawable-helpers";
import { ShapeDrawable } from "./shape-drawable";
import { ContainerDrawable } from "./container-drawable";
import { ImageDrawable } from "./image-drawable";
import {
    TileBlockDrawable,
    getTileHeight,
    getTileWidth,
} from "./tile-block-drawable";
import { drawTileBlockDrawable } from "./tile-block-drawable-drawer";
import { AnimatedDrawable } from "./animated-drawable";
import { TextDrawable } from "./text-drawable";
import { ShapeType, Shape, cppTypeToShapeType } from "./shape";
import { Circle } from "./circle";
import { Rectangle } from "./rectangle";

export function getDrawableAttributeDrawnConstruct(
    drawableAttribute: DrawableAttribute,
    assetService: AssetService,
    position: Vector
): DrawnConstruct {
    if (!drawableAttribute.topDrawable) {
        return null;
    }

    return drawDrawable(drawableAttribute.topDrawable, assetService, position);
}

export function drawDrawable(
    drawable: Drawable,
    assetService: AssetService,
    position: Vector,
    ignoreInactive: boolean = false
): DrawnConstruct {
    if (drawable.inactive && !ignoreInactive) {
        return null;
    }

    let drawnConstruct: DrawnConstruct;
    let drawableType = cppTypeToDrawableType(drawable.__cpp_type);
    let transformProperties: TransformProperties = {
        anchor: drawable.anchor,
        rotation: drawable.rotation,
        scale: drawable.scale,
        position: position,
    };
    switch (drawableType) {
        case DrawableType.Shape:
            drawnConstruct = _drawShapeDrawable(
                drawable as ShapeDrawable,
                transformProperties
            );
            break;
        case DrawableType.Container:
            drawnConstruct = _drawContainerDrawable(
                drawable as ContainerDrawable,
                assetService,
                ignoreInactive,
                transformProperties
            );
            break;
        case DrawableType.Image:
            drawnConstruct = _drawImageDrawable(
                drawable as ImageDrawable,
                assetService,
                transformProperties
            );
            break;
        case DrawableType.Animated:
            drawnConstruct = _drawAnimatedDrawable(
                drawable as AnimatedDrawable,
                assetService,
                ignoreInactive,
                transformProperties
            );
            break;
        case DrawableType.Text:
            drawnConstruct = _drawTextDrawable(
                drawable as TextDrawable,
                assetService,
                transformProperties
            );
            break;
        case DrawableType.TileBlock:
            drawnConstruct = drawTileBlockDrawable(
                drawable as TileBlockDrawable,
                assetService,
                transformProperties
            );
            break;
        default:
            drawnConstruct = null;
            break;
    }

    return drawnConstruct;
}

function _drawShapeDrawable(
    shapeDrawable: ShapeDrawable,
    transformProperties: TransformProperties
): ShapeDrawnConstruct {
    let drawnConstruct = new ShapeDrawnConstruct(
        shapeDrawable,
        transformProperties
    );
    return drawnConstruct;
}

function _drawImageDrawable(
    imageDrawable: ImageDrawable,
    assetService: AssetService,
    transformProperties: TransformProperties
): DrawnConstruct {
    try {
        let texture = _getTexture(imageDrawable, assetService);
        if (!texture) {
            return null;
        }

        let drawnConstruct = new ImageDrawnConstruct(
            imageDrawable,
            texture,
            transformProperties
        );
        return drawnConstruct;
    } catch (e) {
        console.log(e.message);
        return drawMissingAsset(assetService);
    }
}

function _getTexture(
    imageDrawable: ImageDrawable,
    assetService: AssetService
): Texture {
    if (!imageDrawable.textureKey) {
        return null;
    }

    let baseTexture = assetService.get({
        key: imageDrawable.textureKey,
        type: "TexturePNG",
    });
    if (!baseTexture) {
        return null;
    }

    let texture: Texture;
    if (imageDrawable.isWholeImage) {
        texture = new Texture(baseTexture);
    } else {
        if (_isPartialImageValidForTexture(imageDrawable, baseTexture)) {
            texture = new Texture(
                baseTexture,
                new PIXI.Rectangle(
                    imageDrawable.textureRect.position.x,
                    imageDrawable.textureRect.position.y,
                    imageDrawable.textureRect.dimension.x,
                    imageDrawable.textureRect.dimension.y
                )
            );
        } else {
            throw new Error("Partial image dimensions incorrect");
        }
    }
    return texture;
}

function _isPartialImageValidForTexture(
    imageDrawable: ImageDrawable,
    texture: Texture
) {
    return (
        imageDrawable.textureRect.position.x +
            imageDrawable.textureRect.dimension.x <=
            texture.frame.width &&
        imageDrawable.textureRect.position.y +
            imageDrawable.textureRect.dimension.y <=
            texture.frame.height
    );
}

function _drawContainerDrawable(
    containerDrawable: ContainerDrawable,
    assetService: AssetService,
    ignoreInactive: boolean,
    transformProperties: TransformProperties
): ContainerDrawnConstruct {
    if (
        !containerDrawable.drawables ||
        containerDrawable.drawables.length === 0
    ) {
        return null;
    }

    let childConstructs: DrawnConstruct[] = [];
    for (let drawable of containerDrawable.drawables) {
        let childDrawable = drawDrawable(
            drawable,
            assetService,
            { x: 0, y: 0 },
            ignoreInactive
        );
        if (childDrawable) {
            childConstructs.push(childDrawable);
        }
    }
    let drawnConstruct = new ContainerDrawnConstruct(
        childConstructs,
        transformProperties
    );

    return drawnConstruct;
}

function _drawAnimatedDrawable(
    animatedDrawable: AnimatedDrawable,
    assetService: AssetService,
    ignoreInactive: boolean,
    transformProperties: TransformProperties
): AnimatedDrawnConstruct {
    if (!animatedDrawable.frames || animatedDrawable.frames.length === 0) {
        return null;
    }

    let frames: DrawnConstruct[] = [];
    for (let frame of animatedDrawable.frames) {
        let frameDrawable = drawDrawable(
            frame,
            assetService,
            { x: 0, y: 0 },
            ignoreInactive
        );
        if (frameDrawable) {
            frames.push(frameDrawable);
        }
    }
    let drawnConstruct = new AnimatedDrawnConstruct(
        frames,
        animatedDrawable.duration,
        transformProperties
    );
    return drawnConstruct;
}

function _drawTextDrawable(
    textDrawable: TextDrawable,
    assetService: AssetService,
    transformProperties: TransformProperties
): DrawnConstruct {
    let fontKey = textDrawable.text.fontKey || "Arial";
    let drawnConstruct = new TextDrawnConstruct(
        textDrawable,
        assetService.fontFamilyFromAssetKey(fontKey),
        transformProperties
    );
    return drawnConstruct;
}

export class ShapeDrawnConstruct extends DrawnConstruct {
    private _graphics: Graphics = new Graphics();

    constructor(
        private _shapeDrawable: ShapeDrawable,
        transformProperties: TransformProperties
    ) {
        super();
        this.transformProperties = transformProperties;

        let colorHex = colorToHex(this._shapeDrawable.shape.fillColor);
        this._graphics.beginFill(parseInt(colorHex, 16), this._shapeDrawable.shape.fillColor.a / 255);
        // this._graphics.fillColor = this._shapeDrawable.shape.fillColor.a / 255;
        let shapeType = cppTypeToShapeType(
            this._shapeDrawable.shape.__cpp_type
        );
        switch (shapeType) {
            case ShapeType.Circle:
                let radius = (this._shapeDrawable.shape as Circle).radius;
                drawEllipse({ x: 0, y: 0 }, radius, radius, this._graphics);
                break;
            case ShapeType.Rectangle:
                let dimension = (this._shapeDrawable.shape as Rectangle)
                    .dimension;
                drawRectangle({ x: 0, y: 0 }, dimension, this._graphics);
                break;
        }
        this._graphics.endFill();
        this._applyDisplayObjectTransforms(this._graphics);
    }

    draw(totalMillis: number): DisplayObject {
        return this._graphics;
    }
}

export class ImageDrawnConstruct extends DrawnConstruct {
    private _sprite: DisplayObject = null;

    constructor(
        private _imageDrawable: ImageDrawable,
        private _texture: Texture,
        transformProperties: TransformProperties
    ) {
        super();
        this.transformProperties = transformProperties;

        if (this._imageDrawable.isTiled && this._imageDrawable.tiledArea) {
            this._sprite = new TilingSprite(
                this._texture,
                this._imageDrawable.tiledArea.x,
                this._imageDrawable.tiledArea.y
            );
        } else {
            this._sprite = new Sprite(this._texture);
        }
        this._applyDisplayObjectTransforms(this._sprite);
    }

    draw(totalMillis: number): DisplayObject {
        return this._sprite;
    }
}

export class ContainerDrawnConstruct extends DrawnConstruct {
    private _container: Container = new Container();

    constructor(
        private _childConstructs: DrawnConstruct[],
        transformProperties: TransformProperties
    ) {
        super();
        this.transformProperties = transformProperties;
    }

    draw(totalMillis: number): DisplayObject {
        this._container.removeChildren();
        for (let childConstruct of this._childConstructs) {
            let childDisplayObject = childConstruct.draw(totalMillis);
            if (childDisplayObject) {
                this._container.addChild(childDisplayObject);
            }
        }
        this._applyDisplayObjectTransforms(this._container);
        return this._container;
    }
}

export class AnimatedDrawnConstruct extends DrawnConstruct {
    private _container: Container = new Container();

    constructor(
        private _frames: DrawnConstruct[],
        private _duration: number,
        transformProperties: TransformProperties
    ) {
        super();
        this.transformProperties = transformProperties;
    }

    draw(totalMillis: number): DisplayObject {
        let curFrameIndex = 0;
        if (this._duration !== 0) {
            curFrameIndex =
                Math.trunc(totalMillis / (this._duration * 1000)) %
                this._frames.length;
        }

        let curFrame = this._frames[curFrameIndex];
        if (curFrame) {
            this._container.removeChildren();
            this._container.addChild(curFrame.draw(totalMillis));
            this._applyDisplayObjectTransforms(this._container);
            return this._container;
        }
        return null;
    }
}

export class TextDrawnConstruct extends DrawnConstruct {
    private _text: Text;

    constructor(
        private _textDrawable: TextDrawable,
        private _fontFamily: string,
        transformProperties: TransformProperties
    ) {
        super();
        this.transformProperties = transformProperties;

        let colorHex = "#" + colorToHex(this._textDrawable.text.color);
        this._text = new Text(this._textDrawable.text.text, {
            fontFamily: this._fontFamily,
            fontSize: this._textDrawable.text.characterSize,
            fill: colorHex,
        } as PIXI.TextStyle);
        this._applyDisplayObjectTransforms(this._text);
    }

    draw(totalMillis: number): DisplayObject {
        return this._text;
    }
}
