import {
    AfterViewInit,
    Component,
    ElementRef,
    ViewChild,
    OnDestroy,
    OnInit,
} from "@angular/core";
import { Container, DisplayObject, Graphics, Sprite, Texture } from "pixi.js";
import { Subscriber } from "rxjs";
import { TimerObservable } from "rxjs/observable/TimerObservable";

import { StoreService } from "../state/store.service";
import { AssetService, Asset, ProjectService } from "../project";
import {
    setScrollPositionsAction,
    setInitialMap,
    setScaleAction,
    setHiddenLayers,
    setHiddenAttributes,
} from "../project/user-meta-data";
import { ArraySelectComponent, SelectOption } from "../controls";
import { EntitySystemService, Entity, TaggedEntity } from "../entitysystem/";
import { EntityLayerService } from "../entitysystem/services/entity-layer.service";
import { Vector } from "../math";
import { KeyboardService } from "../util/keyboard.service";
import { MouseService } from "../util/mouse.service";
import { CopyPasteService, SelectionService, Selection } from "../selection";

import { EntityDrawerService, EntityCache, DrawnConstruct } from "./drawing";
import { RenderPriorityService } from "./drawing/render-priority.service";
import { TopToolbarComponent, BottomToolbarComponent } from "./_toolbars";
import { CanvasComponent } from "./canvas.component";
import { drawRectangle, drawGrid } from "./drawing/util";
import { BaseTool, ToolService, MapMoveTool, BimodalTool } from "./tools";

type LayerCache = {
    graphics: Graphics;
    drawnConstructs: DrawnConstruct[];
};

type DrawableCache = {
    layers: LayerCache[];
    entityCache: EntityCache;
};

/**
 * The MapEditorComponent contains the canvas and tools needed to interact with the map.
 */
@Component({
    selector: "dk-map-editor",
    styleUrls: ["./duckling/canvas/map-editor.component.css"],
    template: `
        <mat-card>
            <dk-top-toolbar
                class="canvas-top-toolbar mat-elevation-z4"
                [selectedToolKey]="tool.key"
                [mapName]="projectService.project.getValue().currentMap.key"
                (toolSelection)="onToolSelected($event)"
                (mapSelected)="openMap($event)"
                (saveClicked)="onSave()">
            </dk-top-toolbar>

            <dk-canvas #canvasElement
                class="canvas"
                [tool]="tool"
                [gridSize]="projectService.project.getValue().currentMap.gridSize"
                [scale]="scale"
                [showGrid]="showGrid"
                [entitySystemDisplayObject]="entitySystemDisplayObject"
                [toolDisplayObject]="toolDisplayObject"
                [initialScrollPosition]="initialScrollPosition"
                (elementCopy)="copyEntity()"
                (elementPaste)="pasteEntity($event)"
                (scaleChanged)="onScaleChanged($event)">
            </dk-canvas>

            <dk-bottom-toolbar
                class="canvas-bottom-toolbar mat-elevation-z4"
                [gridSize]="projectService.project.getValue().currentMap.gridSize"
                [scale]="scale"
                [showGrid]="showGrid"
                (gridSizeChanged)="onGridSizeChanged($event)"
                (scaleChanged)="onScaleChanged($event)"
                (showGridChanged)="onShowGridChanged($event)">
            </dk-bottom-toolbar>
        </mat-card>
    `,
})
export class MapEditorComponent implements AfterViewInit, OnInit, OnDestroy {
    /**
     * Current tool in use
     */
    tool: BaseTool;

    /**
     * Scale of the map elements
     */
    scale: number = 1;

    /**
     * Determines if the grid should be rendered with the map
     */
    showGrid: boolean = true;

    /**
     * The display object sent to the canvas with all the visual aspects of the entity systems
     */
    entitySystemDisplayObject: Container = new Container();
    toolDisplayObject: Container = new Container();

    initialScrollPosition: Vector = { x: 0, y: 0 };

    private _framesPerSecond = 30;
    private _totalMillis = 0;
    private _redrawInterval: Subscriber<any>;
    private _drawerServiceSubscription: Subscriber<any>;
    private _toolDrawnConstructChangedSubscription: Subscriber<any>;
    private _drawingCache: DrawableCache = { layers: [], entityCache: {} };

    @ViewChild("canvasElement", { static: false }) canvasElement: ElementRef;
    @ViewChild("canvasElement", { static: false }) canvasComponent: CanvasComponent;

    constructor(
        public projectService: ProjectService,
        private _entitySystemService: EntitySystemService,
        private _selection: SelectionService,
        private _copyPaste: CopyPasteService,
        private _toolService: ToolService,
        private _assetService: AssetService,
        private _entityDrawerService: EntityDrawerService,
        private _keyboardService: KeyboardService,
        private _mouseService: MouseService,
        private _entityLayerService: EntityLayerService,
        private _renderPriorityService: RenderPriorityService,
        private _storeService: StoreService
    ) {
        this._setTool(this._toolService.defaultTool);
    }

    ngOnInit() {
        this._drawerServiceSubscription = this._entityDrawerService.redraw.subscribe(
            (entityCacheValid) => {
                this._clearCache(entityCacheValid);
            }
        ) as Subscriber<any>;

        this._loadMetaData();
    }

    ngAfterViewInit() {
        this._redrawInterval = TimerObservable.create(
            0,
            1000 / this._framesPerSecond
        ).subscribe(() => this._drawFrame()) as Subscriber<any>;
    }

    ngOnDestroy() {
        this._redrawInterval.unsubscribe();
        this._drawerServiceSubscription.unsubscribe();
        this._toolDrawnConstructChangedSubscription.unsubscribe();
    }

    onSave() {
        this._saveMetaData();
        this.projectService.save();
    }

    private _saveMetaData() {
        let mergeKey = this._storeService.getLastMergeKey();
        this._storeService.dispatch(
            setScrollPositionsAction(
                this.projectService.project.value.currentMap.key,
                this.canvasComponent.scrollPosition
            ),
            mergeKey
        );
        this._storeService.dispatch(
            setInitialMap(this.projectService.project.value.currentMap.key),
            mergeKey
        );
        this._storeService.dispatch(
            setScaleAction(
                this.projectService.project.value.currentMap.key,
                this.scale
            ),
            mergeKey
        );
        this._storeService.dispatch(
            setHiddenLayers(
                this.projectService.project.value.currentMap.key,
                this._entityLayerService.hiddenLayers.value.hiddenLayers
            ),
            mergeKey
        );
        this._storeService.dispatch(
            setHiddenAttributes(
                this._entityLayerService.hiddenLayers.value.hiddenAttributes
            ),
            mergeKey
        );
    }

    private _drawFrame() {
        this._totalMillis += 1000 / this._framesPerSecond;
        this._redrawAllDisplayObjects();
    }

    copyEntity() {
        let selections = this._selection.selections.value;
        this._copyPaste.copy(
            selections.map((selection: Selection) => {
                return selection as TaggedEntity;
            })
        );
    }

    pasteEntity(position: Vector) {
        this._copyPaste.paste(position);
    }

    onToolSelected(newTool: BaseTool) {
        this._setTool(newTool);
        this._clearCache();
    }

    onGridSizeChanged(gridSize: number) {
        this.projectService.changeGridSize(gridSize);
        this._clearCache();
    }

    onScaleChanged(scale: number) {
        this.scale = scale;
        this._clearCache();
    }

    onShowGridChanged(showGrid: boolean) {
        this.showGrid = showGrid;
        this._clearCache();
    }

    async openMap(mapKey: string) {
        await this.projectService.openMap(mapKey);
        this._loadMetaData();
        this._clearCache();
    }

    private _loadMetaData() {
        this._loadGlobalMetaData();
        this._loadMapMetaData();
    }

    private _loadGlobalMetaData() {
        let curGlobalMetaData = this.projectService.project.value.userMetaData;

        if (curGlobalMetaData.hiddenAttributes) {
            for (let curAttribute in curGlobalMetaData.hiddenAttributes) {
                this._entityLayerService.setAttributeVisibility(
                    curAttribute,
                    curGlobalMetaData.hiddenAttributes[curAttribute]
                );
            }
        }
    }

    private _loadMapMetaData() {
        let curMapUserMetaData = this.projectService.project.value.userMetaData
            .mapMetaData[this.projectService.project.value.currentMap.key];
        if (!curMapUserMetaData) {
            return;
        }

        this.scale = curMapUserMetaData.scale;
        this.initialScrollPosition = curMapUserMetaData.scrollPosition || {
            x: 0,
            y: 0,
        };
        if (curMapUserMetaData.hiddenLayers) {
            for (let curLayer in curMapUserMetaData.hiddenLayers) {
                this._entityLayerService.setLayerVisibility(
                    curLayer,
                    curMapUserMetaData.hiddenLayers[curLayer]
                );
            }
        }
    }

    private _redrawAllDisplayObjects() {
        if (this._drawingCache.layers.length === 0) {
            let drawnConstructs: DrawnConstruct[] = this._entityDrawerService.drawEntitySystem(
                this._entitySystemService.entitySystem.value,
                this._drawingCache.entityCache
            );

            let layeredDrawnConstructs = this._renderPriorityService.sortDrawnConstructs(
                drawnConstructs
            );
            for (
                let layer = 0;
                layer < layeredDrawnConstructs.length;
                layer++
            ) {
                this._drawingCache.layers[layer] = {
                    graphics: new Graphics(),
                    drawnConstructs: layeredDrawnConstructs[layer],
                };
            }
            this._paintDrawableCache();
        }

        this._buildEntitySystemDisplayObject();
        this._buildToolDisplayObject(this.tool.drawTool(this.scale));
    }

    private _buildEntitySystemDisplayObject() {
        this.entitySystemDisplayObject = new Container();

        for (let layerCache of this._drawingCache.layers) {
            for (let drawnConstruct of layerCache.drawnConstructs) {
                let displayObject = drawnConstruct.draw(this._totalMillis);
                if (displayObject) {
                    this.entitySystemDisplayObject.addChild(displayObject);
                }
                this.entitySystemDisplayObject.addChild(layerCache.graphics);
            }
        }
    }

    private _buildToolDisplayObject(tool: DrawnConstruct) {
        this.toolDisplayObject = new Container();
        let graphics = new Graphics();
        let toolDisplayObjectInstance = tool.draw(this._totalMillis);
        if (toolDisplayObjectInstance) {
            this.toolDisplayObject.addChild(toolDisplayObjectInstance);
        }
        tool.paint(graphics);
        this.toolDisplayObject.addChild(graphics);
    }

    private _paintDrawableCache() {
        for (let layerCache of this._drawingCache.layers) {
            for (let drawnConstruct of layerCache.drawnConstructs) {
                drawnConstruct.paint(layerCache.graphics);
            }
        }
    }

    private _setTool(tool: BaseTool) {
        this.tool = new BimodalTool(
            tool,
            this._toolService.getTool("MapMoveTool"),
            this._keyboardService,
            this._mouseService
        );

        if (this._toolDrawnConstructChangedSubscription) {
            this._toolDrawnConstructChangedSubscription.unsubscribe();
        }
        this._toolDrawnConstructChangedSubscription = this.tool.drawnConstructChanged.subscribe(
            () => {
                this._clearCache(true);
            }
        ) as Subscriber<any>;
    }

    private _clearCache(entityCacheValid: boolean = false) {
        this._drawingCache = {
            layers: [],
            entityCache: entityCacheValid ? this._drawingCache.entityCache : {},
        };
        this._buildToolDisplayObject(this.tool.drawTool(this.scale));
    }
}
