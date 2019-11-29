import 'hammerjs';
import { NgModule, ApplicationRef, Type } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { remote } from "electron";
import { SCALE_MODES } from "pixi.js";
import * as PIXI from "pixi.js";

import { EntityDrawerService } from "./canvas/drawing/entity-drawer.service";
import { RenderPriorityService } from "./canvas/drawing/render-priority.service";

import { CanvasModule } from "./canvas/canvas.module";
import { ControlsModule } from "./controls";
import { EntityEditorModule } from "./entityeditor";
import { EntitySystemModule, mergeEntityAction } from "./entitysystem";
import { GameModule } from "./game/game.module";
import { StoreService, StateModule } from "./state";
import { ProjectModule } from "./project";
import { SelectionModule } from "./selection";
import { ShellComponent, ShellModule } from "./shell";
import { SplashModule } from "./splash";
import { mainReducer } from "./main.reducer";
import { UtilModule } from "./util";
import { DucklingElectronModule } from "../electron/duckling-electron.module";
import { MigrationModule } from "./migration/migration.module";

remote.getCurrentWindow().removeAllListeners();

let storeService = new StoreService(mainReducer, mergeEntityAction);

// Setup window defaults
@NgModule({
    imports: [
        CanvasModule,
        ControlsModule,
        BrowserModule,
        EntityEditorModule,
        EntitySystemModule,
        GameModule,
        ProjectModule,
        SelectionModule,
        ShellModule,
        SplashModule,
        StateModule,
        UtilModule,
        DucklingElectronModule,
        MigrationModule,
    ],
    providers: [{ provide: StoreService, useValue: storeService }],
    entryComponents: [ShellComponent],
})
export class DucklingAppModule {
    constructor(private _appRef: ApplicationRef) {}

    ngDoBootstrap() {
        this._appRef.bootstrap(ShellComponent);
    }
}

platformBrowserDynamic().bootstrapModule(DucklingAppModule);

// set pixi.js to use nearest neighbor scaling method as a default
PIXI.settings.SCALE_MODE = SCALE_MODES.NEAREST;
