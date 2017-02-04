import {Sprite} from 'pixi.js';

import {DrawnConstruct} from '../../canvas/drawing';
import {Entity} from '../../entitysystem/entity';
import {AssetService} from '../../project';

/**
 * Used to draw a camera attribute
 * @param  entity The entity with the camera attribute
 * @return Camera drawable
 */
export function drawCameraAttribute(entity : Entity, assetService : AssetService) : DrawnConstruct {
    let cameraTexture = assetService.get({key: "fa-video-camera", type: "TexturePNG"}, true);
    let sprite = new Sprite(cameraTexture);
    return sprite;
}
