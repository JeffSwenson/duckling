import { Store, Reducer } from "redux";

import { Action } from "./actions";
import { List } from "immutable";

export const UNDO_ACTION = "UndoRedo.Undo";
export const REDO_ACTION = "UndoRedo.Redo";
export const CLEAR_HISTORY_ACTION = "UndoRedo.Clear";

export type MergeKey = number;
let key = 1;
/**
 * Create a new unique merge key.
 * @return A merge key that can be used to merge actions.
 */
export function newMergeKey(): MergeKey {
    return key++;
}

export function getLastMergeKey(
    undoRedoStore: Store<UndoRedoState<any>>
): MergeKey {
    let state = undoRedoStore.getState();
    if (state && state.lastAction && state.lastAction.mergeKey) {
        return state.lastAction.mergeKey;
    }

    return newMergeKey();
}

/**
 * Create a new undo action.
 */
export function undoAction(): Action {
    return {
        type: UNDO_ACTION,
    };
}

/**
 * Create a new redo action.
 */
export function redoAction(): Action {
    return {
        type: REDO_ACTION,
    };
}

/**
 * Create a clear state action.
 */
export function clearUndoHistoryAction(): Action {
    return {
        type: CLEAR_HISTORY_ACTION,
    };
}

/**
 * State used by the UndoRedo reducer.
 */
export interface UndoRedoState<T> {
    stateHistory: List<T>;
    undoHistory?: List<T>;
    lastAction?: Action;
    state?: T;
}

/**
 * Get the current state from the UndoRedoStore.
 */
export function getCurrentState<T>(undoRedoStore: Store<UndoRedoState<T>>): T {
    let state = undoRedoStore.getState();
    return state ? state.state : null;
}

/**
 * A function that is used to determine if two actions should be merged.
 */
export interface AutoMerger {
    (action: Action, previousAction: Action): boolean;
}

function _initialState<T>(rootReducer: Reducer<T>): UndoRedoState<T> {
    return {
        stateHistory: List<T>(),
        state: rootReducer(undefined, { type: "" }),
    };
}

/**
 * Given a reducer and an automerger determine construct a reducer for duckling that supports
 * undo and redo.
 */
export function createUndoRedoReducer<T>(
    rootReducer: Reducer<T>,
    autoMerger: AutoMerger
): Reducer<UndoRedoState<T>> {
    return function(state: UndoRedoState<T>, action: Action): UndoRedoState<T> {
        state = state || _initialState(rootReducer);

        switch (action.type) {
            case UNDO_ACTION:
                return _undo(state);
            case REDO_ACTION:
                return _redo(state);
            case CLEAR_HISTORY_ACTION:
                return _clear(state);
            default:
                return _applyReducer<T>(rootReducer, autoMerger, state, action);
        }
    };
}

function _applyReducer<T>(
    rootReducer: Reducer<T>,
    autoMerger: AutoMerger,
    state: UndoRedoState<T>,
    action: Action
): UndoRedoState<T> {
    let baseState = state;
    if (_shouldMerge(action, state.lastAction, autoMerger)) {
        baseState = _undo(state);
    }

    return {
        stateHistory: baseState.stateHistory.push(baseState.state),
        state: rootReducer(state.state, action),
        lastAction: action,
    };
}

function _shouldMerge(
    action: Action,
    prevAction: Action,
    autoMerger: AutoMerger
) {
    if (!action || !prevAction) {
        return false;
    }

    if (action.mergeKey || prevAction.mergeKey) {
        return action.mergeKey === prevAction.mergeKey;
    }

    return autoMerger(action, prevAction);
}

function _clear<T>(state: UndoRedoState<T>): UndoRedoState<T> {
    return {
        stateHistory: List<T>(),
        state: state.state,
    };
}

function _undo<T>(state: UndoRedoState<T>): UndoRedoState<T> {
    if (!state.stateHistory.isEmpty()) {
        let undoHistory: List<any> = state.undoHistory
            ? state.undoHistory
            : List();
        let nextState = state.stateHistory.last<T>();
        return {
            stateHistory: state.stateHistory.pop(),
            undoHistory: undoHistory.push(state.state),
            state: nextState,
        };
    } else {
        return state;
    }
}

function _redo<T>(state: UndoRedoState<T>): UndoRedoState<T> {
    if (state.undoHistory && !state.undoHistory.isEmpty()) {
        return {
            stateHistory: state.stateHistory.push(state.state),
            undoHistory: state.undoHistory.pop(),
            state: state.undoHistory.last(),
        };
    } else {
        return state;
    }
}
