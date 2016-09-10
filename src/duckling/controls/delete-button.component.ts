import {
    Component,
    Input,
    Output,
    EventEmitter
} from '@angular/core';

import {IconButton} from './icon-button.component';

/**
 * Component for a general purpose delete button
 */
@Component({
    selector: "dk-delete-button",
    directives: [IconButton],
    styleUrls: ['./duckling/controls/delete-button.component.css'],
    template: `
        <div class="hover">
            <dk-icon-button
                class="non-hover-button"
                tooltip="Delete"
                icon="trash"
                (click)="onClick()">
            </dk-icon-button>
            <dk-icon-button
                class="hover-button"
                tooltip="Delete"
                color="warn"
                icon="trash-o"
                [isRaised]="true"
                (click)="onClick()">
            </dk-icon-button>
        </div>
    `
})
export class DeleteButton {
    @Output() click = new EventEmitter<any>();

    onClick() {
        this.click.emit(true);
    }
}