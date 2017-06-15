import {
    Component,
    Input,
    Output,
    EventEmitter,
    AfterViewInit,
    OnDestroy,
    ViewContainerRef
} from '@angular/core';
import {MdDialog, MdDialogConfig, MdDialogRef} from '@angular/material';
import {Subscriber} from 'rxjs';

import {ProjectService} from '../../project/project.service';
import {AssetService} from '../../project/asset.service';
import {EntityLayerService, Layer, AttributeLayer} from '../../entitysystem/services/entity-layer.service';
import {EntityDrawerService} from '../../canvas/drawing/entity-drawer.service';
import {DialogService} from '../../util/dialog.service';
import {PathService} from '../../util/path.service';
import {openDialog} from '../../util/md-dialog';

@Component({
    selector: 'dk-layer-dialog',
    styleUrls: ["./duckling/entitysystem/services/layer-dialog.component.css"],
    template: `
        <div>
            <dk-section headerText="Attributes">
                <md-list class="attributes-list">
                    <md-list-item
                        *ngFor="let attributeLayer of attributeLayers">
                        <dk-icon-button *ngIf="attributeLayer.isVisible"
                            tooltip="Hide attribute"
                            icon="eye"
                            (iconClick)="toggleAttributeVisibility(attributeLayer)">
                        </dk-icon-button>
                        <dk-icon-button *ngIf="!attributeLayer.isVisible"
                            tooltip="Show attribute"
                            icon="eye-slash"
                            (iconClick)="toggleAttributeVisibility(attributeLayer)">
                        </dk-icon-button>

                        <h2>{{attributeLayer.attributeName}}</h2>
                    </md-list-item>
                </md-list>
            </dk-section>
            <dk-section headerText="Layers">
                <md-list class="layers-list">
                    <md-list-item
                        *ngFor="let layer of layers">
                        <dk-icon-button *ngIf="layer.isVisible"
                            tooltip="Hide layer"
                            icon="eye"
                            (iconClick)="toggleLayerVisibility(layer)">
                        </dk-icon-button>
                        <dk-icon-button *ngIf="!layer.isVisible"
                            tooltip="Show layer"
                            icon="eye-slash"
                            (iconClick)="toggleLayerVisibility(layer)">
                        </dk-icon-button>

                        <h2>{{layer.layerName}}</h2>
                    </md-list-item>
                </md-list>
            </dk-section>
        </div>
    `
})
export class LayerDialogComponent implements AfterViewInit, OnDestroy{

    layers : Layer[] = [];
    attributeLayers : AttributeLayer[] = [];

    private _layerSubscription : Subscriber<any>;
    private _attributeLayerSubscription : Subscriber<any>;

    constructor(private _dialog : DialogService,
                private _entityLayerService : EntityLayerService,
                private _entityDrawerService : EntityDrawerService) {
        this._refreshLayers();
        this._refreshAttributes();
    }

    static open(viewContainer : ViewContainerRef) {
        openDialog<string>(viewContainer, LayerDialogComponent);
    }

    ngAfterViewInit() {
        this._layerSubscription = this._entityLayerService.layers.subscribe(() => {
            this._refreshLayers();
            this._refreshAttributes();
        }) as Subscriber<any>;
    }

    ngOnDestroy() {
        this._layerSubscription.unsubscribe;
        this._attributeLayerSubscription.unsubscribe;
    }

    toggleLayerVisibility(layer : Layer) {
        this._entityLayerService.toggleLayerVisibility(layer.layerName);
    }

    toggleAttributeVisibility(attributeLayer : AttributeLayer) {
        this._entityDrawerService.toggleAttributeVisibility(attributeLayer.attributeName);
    }

    private _refreshLayers() {
        this.layers = Array.from(this._entityLayerService.getLayers());
        this.layers.sort((a, b) => {
            let aAsInt = parseInt(a.layerName);
            let bAsInt = parseInt(b.layerName);
            let layerA = isNaN(aAsInt) ? a.layerName : aAsInt;
            let layerB = isNaN(bAsInt) ? b.layerName : bAsInt;

            if (layerA > layerB) {
                return 1;
            } else if (layerA < layerB) {
                return -1;
            }
            return 0;
        });
    }

    private _refreshAttributes() {
        this.attributeLayers = this._entityDrawerService.getAttributeLayers();
    }
}
