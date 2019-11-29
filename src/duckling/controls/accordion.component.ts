import {
    Component,
    Input,
    Output,
    EventEmitter,
    ContentChild,
    TemplateRef,
    SimpleChange,
} from "@angular/core";

import {
    immutableAssign,
    immutableArrayAssign,
    immutableArrayDelete,
    immutableSwapElements,
} from "../util";

import { AccordionElementComponent } from "./accordion-element.component";
import { TemplateWrapperDirective } from "./template-wrapper.directive";

@Component({
    selector: "dk-accordion",
    template: `
        <dk-accordion-element
            *ngFor="let index of indices()"
            [title]="titleForIndex(index)"
            [opened]="openedElements[keyForIndex(index)]"
            [first]="index === 0"
            [last]="index === elements.length - 1"
            [clone]="clone"
            (deleted)="onElementDeleted(index, $event)"
            (toggled)="onElementToggled(index, $event)"
            (cloned)="onElementCloned(index)"
            (moved)="onElementMoved(index, $event)">
            <ng-template
                *ngIf="openedElements[keyForIndex(index)]"
                [templateWrapper]="elementTemplate"
                [context]="elementContext(index)">
            </ng-template>
        </dk-accordion-element>
    `,
})
export class AccordionComponent<T> {
    @ContentChild(TemplateRef, { static: false }) elementTemplate: TemplateRef<any>;
    /**
     * The list of elements to be displayed in the accordion
     */
    @Input() elements: T[];
    /**
     * The property on the element being displayed in the accordion used for the title
     */
    @Input() titleProperty: string;
    /**
     * An optional prefix that will appear before each element's title
     */
    @Input() titlePrefix: string = "";
    /**
     * A default title that will appear if the value of the titleProperty is blank or null
     */
    @Input() defaultTitle: string = "";
    /**
     * The property on the element that is used to uniquely identify the element
     */
    @Input() keyProperty: string;
    /**
     * Whether the accordion can clone its elements.
     */
    @Input() clone: boolean;
    /**
     * Function emitted when an element has been deleted, passes the new elements array up
     */
    @Output() elementDeleted = new EventEmitter<ReadonlyArray<T>>();
    /**
     * Function emitted when an element has been moved up the accordion, passes the new elements array up
     */
    @Output() elementMovedDown = new EventEmitter<ReadonlyArray<T>>();
    /**
     * Function emitted when an element has been moved down the accordion, passes the new elements array up
     */
    @Output() elementMovedUp = new EventEmitter<ReadonlyArray<T>>();
    /**
     * Function emitted when an element has been cloned to the bottom of the accordion
     */
    @Output() elementCloned = new EventEmitter<ReadonlyArray<T>>();

    /**
     * Keeps track of what elements are currently opened
     */
    openedElements: { [key: string]: boolean } = {};

    onElementDeleted(index: number, deleted: boolean) {
        if (!deleted) {
            return;
        }
        this.elementDeleted.emit(immutableArrayDelete(this.elements, index));
    }

    onElementToggled(index: number, opened: boolean) {
        this.openedElements[this.keyForIndex(index)] = opened;
    }

    onElementMoved(index: number, down: boolean) {
        let newIndex: number = down ? index + 1 : index - 1;
        if (down) {
            this.elementMovedDown.emit(
                immutableSwapElements(this.elements, index, newIndex)
            );
        } else {
            this.elementMovedUp.emit(
                immutableSwapElements(this.elements, index, newIndex)
            );
        }
    }

    onElementCloned(index: number) {
        this.elementCloned.emit(
            immutableArrayAssign(
                this.elements,
                this.elements.concat(this.elements[index])
            )
        );
    }

    indices() {
        if (!this.elements) {
            return [];
        }

        let indices = new Array(this.elements.length);
        for (let i = 0; i < indices.length; i++) {
            indices[i] = i;
        }
        return indices;
    }

    elementContext(index: number) {
        return {
            $index: index,
            $element: this.elements[index],
        };
    }

    keyForIndex(index: number): string {
        if (this.keyProperty) {
            let element: any = this.elements[index];
            return element[this.keyProperty] as string;
        } else {
            return index + "";
        }
    }

    titleForIndex(index: number): string {
        let title = "";
        if (this.titleProperty) {
            title = (<any>this.elements[index])[this.titleProperty] as string;
            if (!title || title === "") {
                title = this.defaultTitle;
            }
        } else {
            title = `${this.defaultTitle} ${index}`;
        }
        return this.titlePrefix + title;
    }
}
