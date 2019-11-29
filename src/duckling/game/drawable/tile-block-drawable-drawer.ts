import {
    RenderTexture,
    Texture,
    Sprite,
    Graphics,
    DisplayObject,
    Container,
    BaseTexture,
    TilingSprite
} from "pixi.js";
import * as PIXI from "pixi.js";

import { drawMissingAsset } from "../../canvas/drawing/util";
import {
    DrawnConstruct,
    TransformProperties,
} from "../../canvas/drawing/drawn-construct";
import { Vector } from "../../math/vector";
import { AssetService } from "../../project/asset.service";

import { TileBlockDrawable, getTileWidth } from "./tile-block-drawable";

export function drawTileBlockDrawable(
    tileBlockDrawable: TileBlockDrawable,
    assetService: AssetService,
    transformProperties: TransformProperties
): DrawnConstruct {
    if (!tileBlockDrawable.textureKey) {
        return null;
    }

    let baseTexture = assetService.get({
        key: tileBlockDrawable.textureKey,
        type: "TexturePNG",
    });
    if (!baseTexture) {
        return drawMissingAsset(assetService);
    }

    return _constructTileBlockSprite(
        tileBlockDrawable,
        baseTexture,
        assetService,
        transformProperties
    );
}

function _constructTileBlockSprite(
    tileBlockDrawable: TileBlockDrawable,
    baseTexture: BaseTexture,
    assetService: AssetService,
    transformProperties: TransformProperties
): DrawnConstruct {
    let tileSize = getTileWidth(tileBlockDrawable, assetService);
    if (tileSize <= 0) {
        return drawMissingAsset(assetService);
    }
    let numberOfTiles = {
        x: tileBlockDrawable.size.x / tileSize,
        y: tileBlockDrawable.size.y / tileSize,
    };

    let positions = _getPositions(numberOfTiles);
    let calculateOffset: { x: boolean; y: boolean } = _getOffsets(
        numberOfTiles
    );

    let drawnConstruct = new TileBlockDrawnConstruct(
        positions,
        baseTexture,
        tileSize,
        numberOfTiles,
        calculateOffset,
        transformProperties
    );
    return drawnConstruct;
}

function _getPositions(numberOfTiles: Vector): Vector[] {
    let positions: Vector[] = [];

    for (let x of _getAxisPositions(numberOfTiles.x)) {
        for (let y of _getAxisPositions(numberOfTiles.y)) {
            positions.push({ x, y });
        }
    }

    return positions;
}

function _getAxisPositions(numberOfTilesOnAxis: number): number[] {
    if (numberOfTilesOnAxis > 1) {
        return [0, 1, 2];
    } else {
        return [3];
    }
}

function _getOffsets(numberOfTiles: Vector): { x: boolean; y: boolean } {
    return { x: numberOfTiles.x !== 1, y: numberOfTiles.y !== 1 };
}

class TileBlockDrawnConstruct extends DrawnConstruct {
    private _container = new Container();

    constructor(
        private _positions: Vector[],
        private _baseTexture: BaseTexture,
        private _tileSize: number,
        private _numberOfTiles: Vector,
        private _calculateOffset: { x: boolean; y: boolean },
        transformProperties: TransformProperties
    ) {
        super();
        this.transformProperties = transformProperties;

        for (let position of this._positions) {
            let texture = new Texture(
                this._baseTexture,
                new PIXI.Rectangle(
                    position.x * this._tileSize,
                    position.y * this._tileSize,
                    this._tileSize,
                    this._tileSize
                )
            );
            let sprite = this._getSprite(position, texture);
            this._container.addChild(sprite);
        }
        this._applyDisplayObjectTransforms(this._container);
    }

    draw(totalMillis: number): DisplayObject {
        return this._container;
    }

    private _getSprite(
        position: Vector,
        texture: Texture
    ): DisplayObject | null {
        // Only tiles in row/column 1 (0 indexed) are ever repeated
        if (position.x === 1 || position.y === 1) {
            return this._getTiledSprite(position, texture);
        } else {
            let sprite = new Sprite(texture);
            sprite.x = this._calculateOffset.x
                ? this._getSpriteOffset(position.x, this._numberOfTiles.x)
                : sprite.x;
            sprite.y = this._calculateOffset.y
                ? this._getSpriteOffset(position.y, this._numberOfTiles.y)
                : sprite.y;
            return sprite;
        }
    }

    private _getTiledSprite(position: Vector, texture: Texture): DisplayObject {
        let tileAreaSizes = this._getTileAreaSizes(position);
        let sprite = new TilingSprite(
            texture,
            tileAreaSizes.x,
            tileAreaSizes.y
        );
        sprite.x = this._calculateOffset.x
            ? this._getSpriteOffset(position.x, this._numberOfTiles.x)
            : sprite.x;
        sprite.y = this._calculateOffset.y
            ? this._getSpriteOffset(position.y, this._numberOfTiles.y)
            : sprite.y;
        return sprite;
    }

    private _getTileAreaSizes(position: Vector): Vector {
        let tileAreaSizes = { x: this._tileSize, y: this._tileSize };
        if (position.x === 1 && this._numberOfTiles.x !== 1) {
            tileAreaSizes.x = (this._numberOfTiles.x - 2) * this._tileSize;
        }
        if (position.y === 1 && this._numberOfTiles.y !== 1) {
            tileAreaSizes.y = (this._numberOfTiles.y - 2) * this._tileSize;
        }
        return tileAreaSizes;
    }

    private _getSpriteOffset(position: number, numberOfTiles: number): number {
        let numTileOffset = position;
        if (position === 2) {
            numTileOffset = numberOfTiles - 1; // Account for middle section
        }
        return numTileOffset * this._tileSize;
    }
}
