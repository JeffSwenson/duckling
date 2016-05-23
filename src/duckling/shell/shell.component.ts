import {Component, Input, ChangeDetectorRef} from 'angular2/core';
import {Entity, EntityComponent} from '../entitysystem';
import {MapEditorComponent} from '../canvas/map-editor.component';
import {SplashComponent} from '../splash/splash.component';
import {ProjectService} from '../project';

@Component({
    selector: 'duckling-shell',
    directives: [
        EntityComponent,
        SplashComponent,
        MapEditorComponent
    ],
    styleUrls: ['./duckling/shell/shell.component.css'],
    template: `
        <div *ngIf="showSplash">
            <dk-splash-screen
                (projectOpened)="onProjectOpened($event)">
            </dk-splash-screen>
        </div>

        <div *ngIf="showLoading">
            Loading...
        </div>

        <div class="shell" *ngIf="showProject">
            <div class="canvas-container">
                <dk-map-editor>
                </dk-map-editor>
            </div>
            <div class="entity-editor-container">
                <dk-entity-component
                    [entity]="_entity">
                </dk-entity-component>
            </div>
        </div>
    `
})
export class ShellComponent {
    constructor(public projectService : ProjectService) {

    }

    onProjectOpened(path : string) {
        this.projectService.open(path);
    }

    get showSplash() {
        return !this.projectService.project.home;
    }

    get showLoading() {
        return !this.showSplash && !this.projectService.project.loaded;
    }

    get showProject() {
        return !this.showSplash && !this.showLoading;
    }
}
