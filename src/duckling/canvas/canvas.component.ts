import {
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    AfterViewInit,
    SimpleChange,
    ViewChild,
    ChangeDetectorRef,
    EventEmitter,
    Output,
} from "@angular/core";
import { Observable } from "rxjs";
import {
    autoDetectRenderer,
    DisplayObject,
    Renderer,
    Graphics,
    Container,
    Point,
} from "pixi.js";

import { Vector } from "../math";
import { WindowService, KeyboardCode } from "../util";
import { MouseButton } from "../util/mouse.service";
import { OptionsService } from "../state/options.service";

import {
    ZOOM_LEVELS,
    DEFAULT_ZOOM_LEVEL,
} from "./_toolbars/canvas-scale.component";
import { drawRectangle, drawGrid } from "./drawing/util";
import {
    BaseTool,
    ToolService,
    MapMoveTool,
    CanvasMouseEvent,
    CanvasKeyEvent,
} from "./tools";
import { MouseService } from "../util/mouse.service";
import { DrawnConstruct } from "./drawing";

/**
 * The Canvas Component is used to render pixijs display objects and wire up Tools.
 */
@Component({
    selector: "dk-canvas",
    styleUrls: ["./duckling/canvas/canvas.component.css"],
    template: `
        <canvas
            #canvas
            class="canvas"
            (mousedown)="onMouseDown($event)"
            (mouseup)="onMouseUp($event)"
            (mousemove)="onMouseDrag($event)"
            (mouseout)="onMouseOut()"
            (wheel)="onMouseWheel($event)">
        </canvas>
    `,
})
export class CanvasComponent implements OnChanges, OnDestroy, AfterViewInit {
    elementDimensions: Vector = { x: 0, y: 0 };

    @Input() gridSize: number;
    @Input() initialScrollPosition: Vector = { x: 0, y: 0 };
    @Input() scale: number;
    @Input() showGrid: boolean;
    @Input() entitySystemDisplayObject: DisplayObject;
    @Input() toolDisplayObject: DisplayObject;
    @Input() tool: BaseTool;

    @ViewChild("canvas", {static: false}) canvasElement: ElementRef;

    /**
     * Event that is published when a user trys to copy something in the canvas.
     */
    @Output() elementCopy = new EventEmitter<any>();

    /**
     * Event that is published whenever a user trys to paste something in the canvas.
     */
    @Output() elementPaste = new EventEmitter<Vector>();

    /**
     * Event that is published when the scale changes via the canvas (ctrl+scroll)
     */
    @Output() scaleChanged = new EventEmitter<number>();

    /**
     * The index of the valid ZOOM_LEVELS
     */
    private _zoomLevel = DEFAULT_ZOOM_LEVEL;
    private _mouseLocation: Vector = { x: 0, y: 0 };
    private _zoomInCanvasCoords: Vector = null;
    private _renderer: Renderer;
    private _scrollStageOffset = 32;
    private _viewInitialized = false;
    private _scrollPosition: Vector = { x: 0, y: 0 };

    constructor(
        private _changeDetector: ChangeDetectorRef,
        private _optionsService: OptionsService,
        private _window: WindowService,
        private _mouseService: MouseService,
        private _toolService: ToolService
    ) {}

    ngAfterViewInit() {
        this._viewInitialized = true;
        this.setupContainingElementEvents();

        if (this._optionsService.getSetting("useWebGL", true)) {
            this._renderer = new Renderer({
                width: this.elementDimensions.x,
                height: this.elementDimensions.y,
                view: this.canvasElement.nativeElement,
                backgroundColor: 0xffffff,
            });
        }

        this._resizeCanvasElements();
        if (
            this.initialScrollPosition.x === 0 &&
            this.initialScrollPosition.y === 0
        ) {
            this._centerStage();
        } else {
            this.scrollTo(this.initialScrollPosition);
        }
        this._render();

        document.addEventListener("copy", (event: ClipboardEvent) =>
            this.onCopy(event)
        );
        document.addEventListener("paste", (event: ClipboardEvent) =>
            this.onPaste(event)
        );
    }

    setupContainingElementEvents() {
        this._window.onResize(() => this.onResize());

        this.canvasElement.nativeElement.parentElement.tabIndex = "1";

        this.canvasElement.nativeElement.parentElement.onmousemove = (
            event: MouseEvent
        ) => event.preventDefault();
        this.canvasElement.nativeElement.parentElement.onkeyup = (
            event: KeyboardEvent
        ) => this.onKeyUp(event);
        this.canvasElement.nativeElement.parentElement.onkeydown = (
            event: KeyboardEvent
        ) => this.onKeyDown(event);
    }

    ngOnChanges(changes: {
        scale?: SimpleChange;
        initialScrollPosition?: SimpleChange;
    }) {
        if (changes.scale) {
            this.onScaleChanged(
                changes.scale.previousValue,
                changes.scale.currentValue
            );
        }
        if (changes.initialScrollPosition) {
            if (
                this._scrollPosition !=
                changes.initialScrollPosition.currentValue
            ) {
                this.scrollTo(changes.initialScrollPosition.currentValue);
            }
        }

        if (this._viewInitialized) {
            this._render();
        }
    }

    onScaleChanged(oldScale: number, newScale: number) {
        let scaleChange = newScale - oldScale;
        if (!this._zoomInCanvasCoords) {
            this._zoomInCanvasCoords = {
                x: this.elementDimensions.x / 2,
                y: this.elementDimensions.y / 2,
            };
        }

        let zoomPoint = this.entitySystemDisplayObject.toLocal(
            new Point(this._zoomInCanvasCoords.x, this._zoomInCanvasCoords.y)
        );

        let offsetPan = {
            x: zoomPoint.x * scaleChange,
            y: zoomPoint.y * scaleChange,
        };

        this._zoomInCanvasCoords = null;
        this._zoomLevel = ZOOM_LEVELS.indexOf(newScale);
        this.scrollPan(offsetPan);
    }

    ngOnDestroy() {
        this._renderer.destroy();
        this._window.removeResizeEvent();
    }

    onCopy(event: ClipboardEvent) {
        if (
            document.activeElement ===
            this.canvasElement.nativeElement.parentElement
        ) {
            this.elementCopy.emit(null);
        }
    }

    onPaste(event: ClipboardEvent) {
        if (
            document.activeElement ===
            this.canvasElement.nativeElement.parentElement
        ) {
            this.elementPaste.emit(
                this.stageCoordsFromCanvasCoords(this._mouseLocation)
            );
        }
    }

    onKeyDown(event: KeyboardEvent) {
        if (this._isPreventedKey(event.keyCode)) {
            event.preventDefault();
        }
        if (this.tool) {
            this.tool.onKeyDown(this._createCanvasKeyEvent(event));
        }
    }

    onKeyUp(event: KeyboardEvent) {
        if (this.tool) {
            this.tool.onKeyUp(this._createCanvasKeyEvent(event));
        }
    }

    onMouseDown(event: MouseEvent) {
        // manually call MouseService's onMouseDown because we need to stop the event from propagating
        // which will cause the MouseService from naturally knowing it happened
        this._mouseService.onMouseDown(event);

        event.stopPropagation();
        this._window.clearSelection();
        this.canvasElement.nativeElement.focus();
        if (this.tool && event.button !== MouseButton.Middle) {
            this.tool.onStageDown(this._createCanvasMouseEvent(event));
        }
    }

    onMouseUp(event: MouseEvent) {
        event.stopPropagation();
        if (this.tool && event.button !== MouseButton.Middle) {
            this.tool.onStageUp(this._createCanvasMouseEvent(event));
        }

        // manually call MouseService's onMouseUp because we need to stop the event from propagating
        // which will cause the MouseService from naturally knowing it happened
        this._mouseService.onMouseUp(event);
    }

    onMouseDrag(event: MouseEvent) {
        if (
            this._mouseLocation &&
            event.offsetX === this._mouseLocation.x &&
            event.offsetY === this._mouseLocation.y
        ) {
            return;
        }

        event.stopPropagation();
        let canvasMouseEvent = this._createCanvasMouseEvent(event);
        let stageCoords = canvasMouseEvent.stageCoords;
        this._mouseLocation = canvasMouseEvent.canvasCoords;
        if (this.tool && event.button !== MouseButton.Middle) {
            this.tool.onStageMove(canvasMouseEvent);
        }
    }

    onMouseOut() {
        event.stopPropagation();
        if (this.tool) {
            this.tool.onLeaveStage();
        }
    }

    onMouseWheel(event: WheelEvent) {
        event.stopPropagation();
        event.preventDefault();
        this._zoomInCanvasCoords = {
            x: event.offsetX,
            y: event.offsetY,
        };

        this._zoomLevel -= Math.sign(event.deltaY);
        if (this._zoomLevel < 0) {
            this._zoomLevel = 0;
        } else if (this._zoomLevel >= ZOOM_LEVELS.length) {
            this._zoomLevel = ZOOM_LEVELS.length - 1;
        }
        this.scale = ZOOM_LEVELS[this._zoomLevel];
        this.scaleChanged.emit(this.scale);
    }

    onResize() {
        this._resizeCanvasElements();
    }

    forwardContainingDivMouseEvent(event: MouseEvent) {
        this.canvasElement.nativeElement.dispatchEvent(
            new MouseEvent(event.type, event)
        );
    }

    forwardContainingDivWheelEvent(event: WheelEvent) {
        this.canvasElement.nativeElement.dispatchEvent(
            new WheelEvent(event.type, event)
        );
    }

    scrollTo(scrollToCoords: Vector) {
        this._scrollPosition = scrollToCoords;
    }

    scrollPan(scrollPanAmount: Vector) {
        this._scrollPosition.x += scrollPanAmount.x;
        this._scrollPosition.y += scrollPanAmount.y;
    }

    stageCoordsFromCanvasCoords(canvasCoords: Vector): Vector {
        if (!this.entitySystemDisplayObject) {
            return canvasCoords;
        }

        return this.entitySystemDisplayObject.toLocal(
            new Point(canvasCoords.x, canvasCoords.y)
        );
    }

    canvasCoordsFromStageCoords(stageCoords: Vector): Vector {
        if (!this.entitySystemDisplayObject) {
            return stageCoords;
        }

        return this.entitySystemDisplayObject.toGlobal(
            new Point(stageCoords.x, stageCoords.y)
        );
    }

    private _resizeCanvasElements() {
        this.elementDimensions.x = this.canvasElement.nativeElement.parentElement.offsetWidth;

        // This 95 is the hardcoded height from the top and bottom toolbars. This is necessary because seemingly the
        // reported height of the flex element that houses the canvas lies about the size when resized. So the idea
        // is to look at the flex container's height and subtract the amount in the toolbars
        this.elementDimensions.y =
            this.canvasElement.nativeElement.parentElement.parentElement
                .offsetHeight - 95;

        this.canvasElement.nativeElement.width = this.elementDimensions.x;
        this.canvasElement.nativeElement.height = this.elementDimensions.y;
        if (this._renderer) {
            this._renderer.resize(
                this.elementDimensions.x,
                this.elementDimensions.y
            );
            this._changeDetector.detectChanges();
        }
    }

    private _centerStage() {
        this.scrollTo({
            x: 0,
            y: 0,
        });
    }

    private _canvasCoordsFromEvent(event: MouseEvent): Vector {
        return {
            x: event.offsetX,
            y: event.offsetY,
        };
    }

    private _render() {
        if (this._renderer) {
            let stage = new Container();

            this._addDisplayObjectToStageLocal(
                stage,
                this.entitySystemDisplayObject
            );
            this._addDisplayObjectToStageWorld(
                stage,
                this._buildGridDisplayObject()
            );
            this._addDisplayObjectToStageLocal(stage, this.toolDisplayObject);

            this._renderer.preserveDrawingBuffer = false;
            this._renderer.render(stage);
        }
    }

    private _addDisplayObjectToStageLocal(
        stage: Container,
        displayObjectToAdd: DisplayObject
    ) {
        stage.addChild(displayObjectToAdd);

        let position = this._stagePosition;
        displayObjectToAdd.position.x = position.x + 0.5;
        displayObjectToAdd.position.y = position.y + 0.5;
        displayObjectToAdd.scale = new Point(this.scale, this.scale);
        displayObjectToAdd.updateTransform();
    }

    private _addDisplayObjectToStageWorld(
        stage: Container,
        displayObjectToAdd: DisplayObject
    ) {
        stage.addChild(displayObjectToAdd);
    }

    private _buildGridDisplayObject(): DisplayObject {
        if (!this.showGrid) {
            return new DisplayObject();
        }

        let stageZero = this.canvasCoordsFromStageCoords({ x: 0, y: 0 });
        let startingPosition = {
            x: stageZero.x % (this.gridSize * this.scale),
            y: stageZero.y % (this.gridSize * this.scale),
        };
        let bottomRight = {
            x: this.elementDimensions.x,
            y: this.elementDimensions.y,
        };

        let graphics = new Graphics();
        graphics.lineStyle(1, 0xeeeeee, 0.5);
        drawGrid(
            startingPosition,
            bottomRight,
            { x: this.gridSize * this.scale, y: this.gridSize * this.scale },
            graphics
        );
        return graphics;
    }

    /**
     * Used to reposition the virtual stage when the canvas has been scrolled
     */
    private get _stagePosition() {
        return {
            x: this.elementDimensions.x / 2 - this._scrollPosition.x,
            y: this.elementDimensions.y / 2 - this._scrollPosition.y,
        };
    }

    get scrollPosition(): Vector {
        return this._scrollPosition;
    }

    private _createCanvasMouseEvent(event: MouseEvent): CanvasMouseEvent {
        let canvasCoords = this._canvasCoordsFromEvent(event);
        return {
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            canvasCoords: canvasCoords,
            stageCoords: this.stageCoordsFromCanvasCoords(canvasCoords),
            canvas: this,
        };
    }

    private _createCanvasKeyEvent(event: KeyboardEvent): CanvasKeyEvent {
        let canvasCoords = this._mouseLocation;
        return {
            keyCode: event.keyCode,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            canvasCoords: canvasCoords,
            stageCoords: this.stageCoordsFromCanvasCoords(canvasCoords),
            canvas: this,
        };
    }

    private _isPreventedKey(keyCode: number) {
        return (
            keyCode === KeyboardCode.SPACEBAR ||
            keyCode === KeyboardCode.UP ||
            keyCode === KeyboardCode.RIGHT ||
            keyCode === KeyboardCode.DOWN ||
            keyCode === KeyboardCode.LEFT
        );
    }
}
