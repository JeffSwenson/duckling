module framework {
    var nextId : number = 0;

    /**
     * A ViewModel is responsible for responding to user actions and population the view
     * with information from the model.
     */
    export class ViewModel<T> {
        protected _attached : boolean = false;
        protected _children : {[id : string]:ViewModel<any>} = {};
        protected _context : framework.Context;
        protected _htmlRoot : HTMLElement;
        protected _rivetsBinding;
        protected _commandCallbacks = {};
        protected _id = nextId++;
        private _data : T;

        /**
         * Initialize the ViewModel. Using init instead of the constructor means that
         * ViewModel subclasses don't need to implement a constructor and forward the
         * arguments to the superclass.
         * @param context Context the ViewModel is hosted in.
         * @param htmlRoot The HTML element the ViewModel is attached to.
         * @param data The root of the ViewModel's data.
         * @returns A reference to the ViewModel instance.
         */
        init(context: framework.Context, htmlRoot : HTMLElement, data : T) : ViewModel<T> {
            this.setData(context, data);
            this.attach(htmlRoot);
            return this;
        }

        /**
         * Set the data and context used by the view model.
         * @param context Context the view model belongs to.
         * @param data Model object the view is bound to.
         */
        setData(context : Context, data : T) {
            this._context = context;
            this._data = data;
            this.onDataReady();
        }

        /**
         * Attach the ViewModel to an element on the page.
         * @param htmlRoot HTML element that will act as a root for the view model.
         */
        attach(htmlRoot : HTMLElement) {
            this._htmlRoot = htmlRoot;
            this.render();
            this._attached = true;
            this.onViewReady();
        }

        /**
         * Create an Id unique to the view. Calling id("string") will always produced the same result
         * for a specific view model, but it will produce different results for different view models.
         * Elements can be retrieved using the findById method.
         * @param base Base of the Id
         * @returns An Id unique to the ViewModel.
         */
        id(base : string) {
            return this._id + base;
        }

        /**
         * Find the child element with the given id.  The id will be transformed using the ViewModel.id method.
         * @param id Id describing the element to be retrieved.
         * @returns Element with the given Id.
         */
        findById(id : string) {
            return document.getElementById(this.id(id));
        }

        /**
         * Renders the ViewModel's template and binds the model to the view.
         */
        private render() {
            this._htmlRoot.innerHTML = this._context.views.getTemplate(this.viewFile).call(this, this);
            this._rivetsBinding = this._context.rivets.bind(this._htmlRoot, this);

            for(var childID in this._children) {
                var child : ViewModel<any> = this._children[childID];
                child.attach(this.findById(childID))
            }
        }


        /**
         * Render the template described by the given name and return it. The viewmodel will be available as the template's
         * this variable.
         * @param id The ID of the element the template should be inserted into
         * @param templateName The name of the template to be rendered.
         * @param locals An object available to the template.
         * @returns Returns the formatted HTML string.
         */
        renderTemplate(templateName : string, locals) {
            return this._context.views.getTemplate(templateName).call(this, locals);
        }

        /**
         * Detach the ViewModel and then render it again.
         */
        reset() {
            if (this._attached) {
                this.detach();
                this.render();
            }
        }

        /**
         * Remove the ViewModel from the page.
         */
        detach() {
            if (this._attached) {
                this._attached = false;
                for(var childKey in this._children) {
                    this._children[childKey].detach();
                }
                this._rivetsBinding.unbind();
                this._htmlRoot.innerHTML = "";
            }
        }

        /**
         * Called when the HTML for the view model is rendered and ready for dom manipulation.
         */
        onViewReady() {

        }

        /**
         * Called when the view model's data object is ready to be accessed.
         */
        onDataReady() {

        }

        /**
         * Child classes should implement this
         * @returns A string defining the view used by the ViewModel.
         */
        get viewFile() : string {
            return "no_view_defined";
        }

        /**
         * Get the class name of the ViewModel.
         * @returns The ViewModel's class name.
         */
        get viewModelName() : string {
            return this.constructor["name"];
        }

        /**
         * Registers a view command callback.
         * @param key Key that identifies the command callback.
         * @param callback Callback that will be fired.
         */
        registerCallback(key : string, callback) {
            this._commandCallbacks[key] = (event, arg) => callback.call(this, event, arg);
        }

        /**
         * Called by rivets when a view command is fired.
         * @param key Key that identifies the view command.
         * @param event The event that triggered the callback.  Usually an HTML event.
         * @param arg Argument describing the event.
         */
        handleCommand(key : string, event, arg) {
            if (key in this._commandCallbacks) {
                this._commandCallbacks[key].call(this, event, arg);
            } else {
                debugger;
            }
        }

        /**
         * Add a child view to the view.
         * @param id Id of the element the child view is bound to.
         * @param vm ViewModel that will be bound to a sub element of this ViewModel's html hierarchy.iewmodel of the child view.
         * @param data Model object the ViewModel is rendering.
         */
        addChildView(id : string, vm: ViewModel<any>, data : any) {
            this._children[id] = vm;
            vm.setData(this._context, data);

            if (this._attached) {
                vm.attach(this.findById(id));
            }
        }

        /**
         * Return the child bound to the element with the given Id.
         * @param id Id of the element the child is bound to.
         */
        getChildView(id : string) {
            return this._children[id] || null;
        }

        /**
         * Call to remove all child views.  Should only be called if the view is detached.
         */
        protected removeChildViews() {
            if (this._attached) {
                for(var childKey in this._children) {
                    this._children[childKey].detach();
                }
            }
            this._children = {};
        }

        /**
         * Replace the current view with the view specified.
         * @param replacement View model that will replace the current view.
         * @param data Data the view model will be initialized with.
         */
        replaceWithView(replacement : ViewModel<any>, data) {
            this.detach();
            replacement.init(this._context, this._htmlRoot, data);
        }

        //region Getters and Setters
        get data() {
            return this._data;
        }
        //endregion
    }
}