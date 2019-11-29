import {
    Component,
    ViewContainerRef,
    ElementRef,
    ViewChild,
    AfterViewInit,
} from "@angular/core";
import { Observable } from "rxjs";

import { removePadding } from "../util/mat-dialog";
import {
    JsonSchemaEdit,
    schemaEditToJson,
} from "../controls/json-schema-edit.component";
import { ProjectService } from "./project.service";
import { CustomAttribute } from "./custom-attribute";

/**
 * Component where the user can add, delete, and edit custom attributes
 */
@Component({
    selector: "dk-custom-attributes",
    styleUrls: [
        "./duckling/layout.css",
        "./duckling/project/custom-attributes.component.css",
    ],
    template: `
        <div 
            #container 
            class="container">
            
            <div class="left-section">
                <mat-list>
                    <mat-list-item *ngFor="let attribute of customAttributes">
                        <span [title]="attribute.key">{{attribute.key}}</span>
                    </mat-list-item>
                </mat-list>
            </div>
            
            <div class="right-section mat-elevation-z8">
                <dk-input
                    class="dk-inline"
                    label="Attribute Name"
                    [value]="curAddingName"
                    [dividerColor]="isValidAttributeName(curAddingName) ? 'primary' : 'warn'"
                    (inputChanged)="onAttributeNameInput($event)">
                </dk-input>
                <dk-json-schema-edit
                    [jsonSchema]="curAddingSchema"
                    (jsonSchemaChanged)="onJsonSchemaChanged($event)">
                </dk-json-schema-edit>
                <div class="adding-section-footer">
                    <div>
                        <button 
                            mat-raised-button
                            class="dk-inline"
                            (click)="onNewAttributeClicked()">
                            Clear
                        </button>
                        <button 
                            mat-raised-button
                            class="dk-inline"
                            color="primary"
                            [disabled]="!isValidAttributeName(curAddingName)"
                            (click)="onAcceptCustomAttribute()">
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class CustomAttributesComponent implements AfterViewInit {
    curAddingSchema: JsonSchemaEdit = { keys: [], contents: [] };
    curAddingName: string = "";
    @ViewChild("container", { static: false }) containerDiv: ElementRef;

    constructor(
        private _project: ProjectService,
        private _viewContainerRef: ViewContainerRef
    ) {}

    ngAfterViewInit() {
        removePadding(this._viewContainerRef);
    }

    onNewAttributeClicked() {
        this.curAddingName = "";
        this.curAddingSchema = { keys: [], contents: [] };
    }

    onAttributeNameInput(newCurAddingName: string) {
        this.curAddingName = newCurAddingName;
    }

    onJsonSchemaChanged(newJsonSchema: JsonSchemaEdit) {
        this.curAddingSchema = newJsonSchema;
    }

    onAcceptCustomAttribute() {
        this._project.addCustomAttribute(
            this.curAddingName,
            schemaEditToJson(this.curAddingSchema)
        );
        this.curAddingName = "";
        this.curAddingSchema = { keys: [], contents: [] };
    }

    isValidAttributeName(newCurAddingName: string): boolean {
        if (!newCurAddingName || newCurAddingName === "") {
            return false;
        }
        if (this._project.isCustomAttribute(newCurAddingName)) {
            return false;
        }
        return true;
    }

    get customAttributes(): CustomAttribute[] {
        let projectAttribute = this._project.project.getValue()
            .customAttributes;
        return projectAttribute ? projectAttribute : [];
    }

    get addingSectionHeader(): string {
        if (this.curAddingSchema !== undefined) {
            return this.curAddingName;
        }
        return "Nothing";
    }
}
