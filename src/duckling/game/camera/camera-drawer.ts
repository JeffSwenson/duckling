import {Sprite} from 'pixi.js';

import {DrawnConstruct} from '../../canvas/drawing';
import {Entity} from '../../entitysystem/entity';
import {AssetService} from '../../project';
import {CameraAttribute} from './camera-attribute';

/**
 * Used to draw a camera attribute
 * @param  entity The entity with the camera attribute
 * @return Camera drawable
 */
export function drawCameraAttribute(cameraAttribute : CameraAttribute, assetService : AssetService) : DrawnConstruct {
    let cameraTexture = assetService.get("fa-video-camera", "TexturePNG", true);
    let sprite = new Sprite(cameraTexture);
    return sprite;
}
