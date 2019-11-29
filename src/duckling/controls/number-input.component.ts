import {
    Component,
    Input,
    Output,
    EventEmitter,
    ViewChild,
} from "@angular/core";
import * as math from "mathjs";

import {
    ValidatedInputComponent,
    Validator,
} from "./validated-input.component";

let numberRegex = /^\-?[0-9]+(\.[0-9]+)?$/;

/**
 * Validated input that only publishes events when the input contains a number.
 */
@Component({
    selector: "dk-number-input",
    styleUrls: ["./duckling/controls/number-input.component.css"],
    template: `
        <dk-validated-input #validatedInputComponent
            [disabled]="disabled"
            [label]="label"
            [value]="value"
            [validator]="combinedValidators"
            (keyup.enter)="onHitEnter()"
            (validInput)="onInput($event)">
        </dk-validated-input>
    `,
})
export class NumberInputComponent {
    /**
     * Reference of the input component used to get the raw value for special calculations
     */
    @ViewChild("validatedInputComponent", { static: false })
    validatedInputComponent: ValidatedInputComponent;

    /**
     * Text label displayed to the user.
     */
    @Input() label: string;
    /**
     * The value stored in the control.
     */
    @Input() value: number;
    /**
     * True if the input is disabled, otherwise false
     */
    @Input() disabled: boolean;
    /**
     * Extra validator
     */
    @Input() validator: Validator;

    /**
     * Event published when the user enters a valid input.
     */
    @Output() validInput = new EventEmitter<number>();

    onInput(value: string) {
        this.validInput.emit(parseFloat(value));
    }

    onHitEnter() {
        let rawValue = this.validatedInputComponent.rawValue;
        try {
            let evaluatedValue = math.evaluate(rawValue);
            if (this.combinedValidators(evaluatedValue + "")) {
                this.validInput.emit(evaluatedValue);
            }
        } catch (e) {}
    }

    isNumber(value: string) {
        return (value + "").match(numberRegex) !== null;
    }

    isFinite(value: string) {
        return Number.isFinite(Number.parseFloat(value));
    }

    get combinedValidators(): Validator {
        return (value: string) => {
            return (
                this.isNumber(value) &&
                this.isFinite(value) &&
                (!this.validator || this.validator(value))
            );
        };
    }
}
