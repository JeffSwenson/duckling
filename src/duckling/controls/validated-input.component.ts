import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChange,
    ViewChild,
} from "@angular/core";

import { InputComponent } from "./input.component";

/**
 * Validator is a function that is run to determine if a given string input is valid
 */
export type Validator = (value: string) => boolean;

/**
 * Helper component used to implement input controls that only accept certain inputs.
 */
@Component({
    selector: "dk-validated-input",
    styleUrls: ["./duckling/controls/validated-input.component.css"],
    template: `
        <dk-input #inputComponent
            [disabled]="disabled"
            [label]="label"
            [value]="value"
            [dividerColor]="color"
            (inputChanged)="onUserInput($event)">
        </dk-input>
    `,
})
export class ValidatedInputComponent implements OnChanges {
    /**
     * Reference of the input component used to get the raw value for special calculations
     */
    @ViewChild("inputComponent", { static: false }) inputComponent: InputComponent;

    /**
     * Text label displayed to the user.
     */
    @Input() label: string;
    /**
     * The value stored in the control.
     */
    @Input() value: string;
    /**
     * Functions used to validate the users input. Should return true if the users input is valid.
     */
    @Input() validator: Validator;
    /**
     * True if the input is disabled, otherwise false
     */
    @Input() disabled: boolean;
    /**
     * Color on the input field
     */
    @Input() color: "primary" | "warn" = "primary";

    /**
     * Event published when the user enters a valid input.
     */
    @Output() validInput = new EventEmitter<String>();

    ngOnChanges(changes: { value?: SimpleChange }) {
        if (changes.value) {
            this._checkValidity(changes.value.currentValue);
        }
    }

    onUserInput(newValue: string) {
        if (this._checkValidity(newValue)) {
            this.validInput.emit(newValue);
        }
    }

    private _checkValidity(valueToCheck: string) {
        if (
            valueToCheck !== undefined &&
            valueToCheck !== null &&
            this.validator(valueToCheck)
        ) {
            this.color = "primary";
            return true;
        } else {
            this.color = "warn";
            return false;
        }
    }

    get rawValue(): string {
        return this.inputComponent.rawValue;
    }
}
