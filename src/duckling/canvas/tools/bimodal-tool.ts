import { Injectable } from "@angular/core";
import { Subscriber, BehaviorSubject, Observable } from "rxjs/Rx";
import { DisplayObject } from "pixi.js";

import { KeyboardService, KeyboardCode } from "../../util/keyboard.service";
import { MouseService, MouseButton } from "../../util/mouse.service";

import { BaseTool, CanvasMouseEvent, CanvasKeyEvent } from "./base-tool";
import { MultiModeTool } from "./multi-mode-tool";

/**
 * A bimodal tool manages a primary tool and a secondary tool that is activated whenever
 * the spacebar is held.
 */
@Injectable()
export class BimodalTool extends MultiModeTool {
    constructor(
        private _primaryTool: BaseTool,
        private _secondaryTool: BaseTool,
        private _keyboardService: KeyboardService,
        private _mouseService: MouseService
    ) {
        super();

        this.drawnConstructChanged = Observable.merge(
            this._primaryTool.drawnConstructChanged,
            this._secondaryTool.drawnConstructChanged
        ) as BehaviorSubject<boolean>;
    }

    protected get selectedTool() {
        if (this._isSecondaryToolActive()) {
            return this._secondaryTool;
        } else {
            return this._primaryTool;
        }
    }

    protected get primaryTool() {
        return this._primaryTool;
    }

    private _isSecondaryToolActive() {
        return (
            this._keyboardService.isKeyDown(KeyboardCode.CTRL) ||
            this._mouseService.isButtonDown(MouseButton.Right)
        );
    }

    get key() {
        return this._primaryTool.key;
    }

    get label() {
        return this._primaryTool.label;
    }

    get icon() {
        return this._primaryTool.icon;
    }
}
