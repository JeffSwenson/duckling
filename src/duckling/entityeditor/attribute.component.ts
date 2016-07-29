import {
    Component,
    ViewContainerRef,
    EventEmitter,
    DynamicComponentLoader,
    ComponentRef,
    Input,
    Output,
    SimpleChange,
    ComponentResolver,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import {Attribute, AttributeKey} from '../entitysystem';
import {AttributeComponentService} from './attribute-component.service';

var logcount = 0;

/**
 * Each attribute has its own component implementation.  This Component is a
 * wrapper that will dynamically instantiate the correct attribute type.
 */
@Component({
    selector: "attribute-component",
    template: "",
    changeDetection : ChangeDetectionStrategy.OnPush,
})
export class AttributeComponent {
    private _childComponent : ComponentRef<AttributeComponent>;

    /**
     * The key of the attribute being displayed.
     */
    @Input() key: AttributeKey;

    /**
     * The Attribute being displayed.
     * @return {[type]} [description]
     */
    @Input() attribute: Attribute;

    /**
     * Event fired when the user modifies an attribute.
     */
    @Output() attributeChanged = new EventEmitter<Attribute>();

    constructor(private _attributeComponentService : AttributeComponentService,
                private _dcl : DynamicComponentLoader,
                private _componentResolver : ComponentResolver,
                private _elementRef : ViewContainerRef,
                private _changeDetector : ChangeDetectorRef) {
    }

    ngOnChanges(changes: {[propertyName: string]: SimpleChange}) {
        if (changes["key"]) {
            this.switchToType(changes["key"].currentValue);
        } else if (changes["attribute"] && this._childComponent) {
            this._childComponent.instance.attribute = changes["attribute"].currentValue;
        }
    }

    switchToType(key : AttributeKey) {
        var type = this._attributeComponentService.getComponentType(key);
        this._componentResolver.resolveComponent(type).then((componentFactory) => {
            var childComponent : ComponentRef<AttributeComponent>;
            childComponent = this._elementRef.createComponent(componentFactory, 0, this._elementRef.injector);

            childComponent.instance.attribute = this.attribute;
            childComponent.instance.key= this.key;
            childComponent.instance.attributeChanged.subscribe((event : Attribute) => this.attributeChanged.emit(event));

            this._childComponent = childComponent;
            this._detectChanges();
        });
    }

    private _detectChanges() {
        this._changeDetector.markForCheck();
    }
}
