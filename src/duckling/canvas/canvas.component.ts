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
    Output
} from 'angular2/core';
import {Observable} from 'rxjs';
import {
    autoDetectRenderer,
    DisplayObject,
    WebGLRenderer,
    CanvasRenderer,
    Graphics,
    Container,
    Point
} from 'pixi.js';

import {drawRectangle} from './drawing/util';
import {BaseTool, ToolService, MapMoveTool} from './tools';
import {Vector} from '../math';
import {isMouseButtonPressed, MouseButton, WindowService} from '../util';

/**
 * The Canvas Component is used to render pixijs display objects and wire up Tools.
 */
@Component({
    selector: 'dk-canvas',
    styleUrls: ['./duckling/canvas/canvas.component.css'],
    template: `
        <div #canvasContainerDiv
            class="canvas-container"
            (copy)="onCopy($event)"
            (paste)="onPaste($event)"
            (mousedown)="forwardContainingDivEvent($event)"
            (mouseUp)="forwardContainingDivEvent($event)"
            (mousemove)="forwardContainingDivEvent($event)"
            (mouseout)="forwardContainingDivEvent($event)">
            <div
                class="canvas-scroll"
                [style.width]="scrollerDimensions.x"
                [style.height]="scrollerDimensions.y">
            </div>
            <canvas
                #canvas
                class="canvas"
                (mousedown)="onMouseDown($event)"
                (mouseup)="onMouseUp($event)"
                (mousemove)="onMouseDrag($event)"
                (mouseout)="onMouseOut()"
                [height]="height"
                [width]="width">
            </canvas>
        </div>
    `
})
export class Canvas implements OnChanges, OnDestroy, AfterViewInit {
    elementDimensions : Vector = {x: 0, y: 0};
    scrollerDimensions : Vector = {x: 0, y: 0};

    @Input() stageDimensions : Vector;
    @Input() gridSize : number;
    @Input() scale : number;
    @Input() showGrid : boolean;
    @Input() canvasDisplayObject : DisplayObject;
    @Input() tool : BaseTool;

    @ViewChild('canvas') canvasRoot : ElementRef;
    @ViewChild('canvasContainerDiv') canvasContainerDiv : ElementRef;

    /**
     * Event that is published when a user trys to copy something in the canvas.
     */
    @Output() elementCopy : EventEmitter<any> = new EventEmitter();

    /**
     * Event that is published whenever a user trys to paste something in the canvas.
     */
    @Output() elementPaste : EventEmitter<Vector> = new EventEmitter();

    private _mouseLocation : Vector = {x: 0, y: 0};
    private _stage : Container = new Container();
    private _renderer : WebGLRenderer | CanvasRenderer;
    private _scrollStageOffset = 32;
    private _viewInited = false;

    constructor(private _changeDetector : ChangeDetectorRef,
                private _window : WindowService,
                private _toolService : ToolService) {
    }

    ngAfterViewInit() {
        this._viewInited = true;
        this._window.onResize(() => this.onResize());
        this.canvasContainerDiv.nativeElement.parentElement.onscroll = () => this.onScroll();

        this._renderer = new CanvasRenderer(this.elementDimensions.x, this.elementDimensions.y, {view: this.canvasRoot.nativeElement});
        this._renderer.backgroundColor = 0xDFDFDF;

        this.resizeCanvasElements();
        this.repositionStage();
        this.centerStage();
        this.render();
    }


    ngOnChanges(changes : {stageDimensions?:SimpleChange, scale?:SimpleChange}) {
        if (!this._viewInited) {
            return;
        }

        if (changes.stageDimensions) {
            this.resizeCanvasElements();
            this.repositionStage();
            this.centerStage();
        } else if (changes.scale) {
            this.resizeCanvasElements();
            this.repositionStage();
        }

        this.render();
    }

    ngOnDestroy() {
        this._renderer.destroy();
    }

    onCopy(event : ClipboardEvent) {
        this.elementCopy.emit(null);
    }

    onPaste(event : ClipboardEvent) {
        this.elementPaste.emit(this._mouseLocation);
    }

    onMouseDown(event : MouseEvent) {
        this.canvasContainerDiv.nativeElement.focus();
        if (this.tool) {
            this.tool.onStageDown({
                canvasCoords: this.canvasCoordsFromEvent(event),
                stageCoords: this.stageCoordsFromEvent(event),
                canvas: this
            });
        }
        event.stopPropagation();
    }

    onMouseUp(event : MouseEvent) {
        if (this.tool) {
            this.tool.onStageUp({
                canvasCoords: this.canvasCoordsFromEvent(event),
                stageCoords: this.stageCoordsFromEvent(event),
                canvas: this
            });
        }
        event.stopPropagation();
    }

    onMouseDrag(event : MouseEvent) {
        var stagePosition = this.stageCoordsFromEvent(event);
        var canvasPosition = this.canvasCoordsFromEvent(event);
        this._mouseLocation = stagePosition;
        if (this.tool && isMouseButtonPressed(event, MouseButton.Left)) {
            this.tool.onStageMove({
                canvasCoords: this.canvasCoordsFromEvent(event),
                stageCoords: this.stageCoordsFromEvent(event),
                canvas: this
            });
        }
        event.stopPropagation();
    }


    onMouseOut() {
        if (this.tool) {
            this.tool.onLeaveStage();
        }
        event.stopPropagation();
    }

    onResize() {
        this.resizeCanvasElements();
        this.render();
    }

    onScroll() {
        this.repositionStage();
        this.render();
    }

    forwardContainingDivEvent(event : MouseEvent) {
        this.canvasRoot.nativeElement.dispatchEvent(new MouseEvent(event.type, event));
    }

    scrollTo(scrollToCoords : Vector) {
        this.canvasContainerDiv.nativeElement.parentElement.scrollLeft = scrollToCoords.x;
        this.canvasContainerDiv.nativeElement.parentElement.scrollTop = scrollToCoords.y;
    }

    get scrollPosition() : Vector {
        return {
            x: this.canvasContainerDiv.nativeElement.parentElement.scrollLeft,
            y: this.canvasContainerDiv.nativeElement.parentElement.scrollTop,
        };
    }

    private resizeCanvasElements() {
        this.elementDimensions.x = this.canvasContainerDiv.nativeElement.clientWidth;
        this.elementDimensions.y = this.canvasContainerDiv.nativeElement.clientHeight;
        this.scrollerDimensions.x = this.elementDimensions.x * 2 + (this.stageDimensions.x * this.scale) - (this._scrollStageOffset * 2);
        this.scrollerDimensions.y = this.elementDimensions.y * 2 + (this.stageDimensions.y * this.scale) - (this._scrollStageOffset * 2);
        this.repositionStage();
        if (this._renderer) {
            this._renderer.view.style.width = this.elementDimensions.x + "px";
            this._renderer.view.style.height = this.elementDimensions.y + "px";
            this._renderer.resize(this.elementDimensions.x, this.elementDimensions.y);
            this._changeDetector.detectChanges();
        }
    }

    private centerStage() {
        this.canvasContainerDiv.nativeElement.parentElement.scrollLeft = (this.scrollerDimensions.x / 2) - (this.elementDimensions.x / 2);
        this.canvasContainerDiv.nativeElement.parentElement.scrollTop = (this.scrollerDimensions.y / 2) - (this.elementDimensions.y / 2);
    }

    private stageCoordsFromEvent(event : MouseEvent) : Vector {
        var localPoint = this._stage.toLocal(new Point(event.offsetX, event.offsetY));
        return {
            x: localPoint.x,
            y: localPoint.y
        }
    }

    private canvasCoordsFromEvent(event : MouseEvent) : Vector {
        return {
            x: event.offsetX,
            y: event.offsetY
        }
    }

    private render() {
        if (this._renderer) {
            this._stage.removeChildren();
            this._stage.addChild(this.canvasDisplayObject);
            this._stage.scale = new Point(this.scale, this.scale);
            this._renderer.render(this._stage);
        }
    }

    /**
     * Used to reposition the virtual stage when the canvas has been scrolled
     */
    private repositionStage() {
        var canvasScrollDifferenceWidth = this.scrollerDimensions.x - this.elementDimensions.x;
        var canvasScrollDifferenceHeight = this.scrollerDimensions.y - this.elementDimensions.y;
        this._stage.x = (this.elementDimensions.x / 2) + 0.5 + (canvasScrollDifferenceWidth / 2) - this.canvasContainerDiv.nativeElement.parentElement.scrollLeft;
        this._stage.y = (this.elementDimensions.y / 2) + 0.5 + (canvasScrollDifferenceHeight / 2) - this.canvasContainerDiv.nativeElement.parentElement.scrollTop;
    }

}
