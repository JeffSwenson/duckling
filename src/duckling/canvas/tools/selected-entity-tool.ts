import { Injectable } from "@angular/core";
import { Subscriber, BehaviorSubject, Observable } from "rxjs/Rx";
import { Container, DisplayObject, Graphics } from "pixi.js";

import { DrawnConstruct } from "../drawing/drawn-construct";

import { MultiModeTool } from "./multi-mode-tool";
import {
    EntityMoveTool,
    EntityMoveToolDrawnConstruct,
} from "./entity-move-tool";
import { EntityResizeTool, ResizeToolDrawnConstruct } from "./resize-tool";
import { BaseTool, CanvasMouseEvent, CanvasKeyEvent } from "./base-tool";

@Injectable()
export class SelectedEntityTool extends MultiModeTool {
    private _resizing: Boolean;

    constructor(
        private _entityMoveTool: EntityMoveTool,
        private _entityResizeTool: EntityResizeTool
    ) {
        super();

        this.drawnConstructChanged = Observable.merge(
            this._entityMoveTool.drawnConstructChanged,
            this._entityResizeTool.drawnConstructChanged
        ) as BehaviorSubject<boolean>;
    }

    protected get selectedTool() {
        if (this._resizing) {
            return this._entityResizeTool;
        } else {
            return this._entityMoveTool;
        }
    }

    protected get primaryTool() {
        return this._entityMoveTool;
    }

    drawTool(canvasZoom: number): DrawnConstruct {
        let drawnConstruct = new SelectedEntityToolDrawnConstruct(
            this._entityResizeTool.createDrawnConstruct(canvasZoom),
            this._entityMoveTool.createDrawnConstruct(canvasZoom)
        );
        drawnConstruct.layer = Number.POSITIVE_INFINITY;
        return drawnConstruct;
    }

    onStageDown(event: CanvasMouseEvent) {
        this._resizing = !!this._entityResizeTool.clickedInAnchor(event);
        super.onStageDown(event);
    }

    onStageUp(event: CanvasMouseEvent) {
        this._resizing = false;
        super.onStageUp(event);
    }

    onLeaveStage() {
        this._resizing = false;
        super.onLeaveStage();
    }

    get key() {
        return "EntityMoveTool";
    }

    get label() {
        return "Move Entity";
    }

    get icon() {
        return "arrows";
    }
}

class SelectedEntityToolDrawnConstruct extends DrawnConstruct {
    private _container = new Container();

    constructor(
        private _resizeToolConstruct: DrawnConstruct,
        private _moveToolConstruct: DrawnConstruct
    ) {
        super();
    }

    draw(totalMillis: number): DisplayObject {
        this._container.removeChildren();
        let resizeToolDisplayObject = this._resizeToolConstruct.draw(
            totalMillis
        );
        if (resizeToolDisplayObject) {
            this._container.addChild(resizeToolDisplayObject);
        }
        let moveToolDisplayObject = this._moveToolConstruct.draw(totalMillis);
        if (moveToolDisplayObject) {
            this._container.addChild(moveToolDisplayObject);
        }
        return this._container;
    }

    paint(graphics: Graphics) {
        this._resizeToolConstruct.paint(graphics);
        this._moveToolConstruct.paint(graphics);
    }
}
