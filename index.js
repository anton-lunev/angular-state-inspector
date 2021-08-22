const panels = chrome && chrome.devtools && chrome.devtools.panels;
const elementsPanel = panels && panels.elements;

if (elementsPanel) {
  elementsPanel.createSidebarPane('State', sidebar => {
    elementsPanel.onSelectionChanged.addListener(() => sidebar.setExpression(`(${getPanelContents})()`));
  });
}

/**
 * @typedef {{
 *    panelState: object,
 *    previousPanelState: object,
 *    originalState: object
 * }} State
 */

// The function below is executed in the context of the inspected page.
function getPanelContents() {
  if (!$0) return;
  const ng = window.ng;
  let isAngular = false;
  let isAngularJs = false;
  let isAngularIvy = false;

  const state = getPanelContent();

  if (state) {
    exportToWindow(state);
  } else {
    const message = 'Cannot retrieve angular state';
    updateState({originalState: message});
    return message;
  }

  return state.panelState;


  /** @returns {State} */
  function getPanelContent() {
    let _panelContent;
    try {
      if (isAngularContext()) { // Angular 2+
        _panelContent = getAngularContent(ng);
        isAngular = true;
      } else if (isAngularIvyContext()) { // Angular ivy
        _panelContent = getAngularIvyContent();
        isAngularIvy = true;
      } else if (isAngularJsContext()) { // AngularJs
        _panelContent = getAngularJsContent(window.angular);
        isAngularJs = true;
      }
    } catch {
      /* proceed */
    }
    return _panelContent;
  }

  /** @returns {boolean} */
  function isAngularContext() {
    try {
      return !!ng.probe($0);
    } catch {
      return false;
    }
  }

  /** @returns {boolean} */
  function isAngularIvyContext() {
    try {
      return !!ng.getContext($0);
    } catch {
      return false;
    }
  }

  /** @returns {boolean} */
  function isAngularJsContext() {
    try {
      return !!window.angular.element($0).scope()
    } catch {
      return false;
    }
  }

  function parseNgMajorVersion() {
    if (window.getAllAngularRootElements) {
      const rootElements = getAllAngularRootElements();
      if (rootElements && rootElements[0]) {
        const versionString = rootElements[0].getAttribute('ng-version');
        return versionString.split('.')[0];
      }
    } else if (window.angular) {
      return 1;
    }
  }

  /** @returns {State} */
  function getAngularJsContent(angular) {
    const originalState = angular.element($0).scope();
    const panelState = clone(originalState);
    return {panelState, previousPanelState: clone(panelState), originalState};
  }

  /** @returns {State} */
  function getAngularContent(ng) {
    const probe = ng.probe($0);
    const originalState = probe.componentInstance;
    const panelState = clone(originalState);
    addStateProp(panelState, '$context', probe.context);
    addStateProp(panelState, '$debugInfo', probe);

    return {panelState, previousPanelState: clone(panelState), originalState};
  }

  /** @returns {State} */
  function getAngularIvyContent() {
    let el = $0;
    const owningComponent = ng.getOwningComponent(el);
    const originalState = ng.getComponent(el) || owningComponent;
    const panelState = clone(originalState);

    if (owningComponent !== originalState) {
      addStateProp(panelState, '$owningComponent', owningComponent);
    }
    addStateProp(panelState, '$context', ng.getContext(el));
    addStateProp(panelState, '$directives', ng.getDirectives(el));
    addStateProp(panelState, '$listeners', ng.getListeners(el));

    return {panelState, previousPanelState: clone(panelState), originalState};
  }

  /**
   * @param {object} state
   * @param {string} name
   * @param {*} value
   */
  function addStateProp(state, name, value) {
    if (value && Object.keys(value).length) {
      // Properties added with defineProperty are shown in a light red color
      Object.defineProperty(state, name, {value, enumerable: false});
    }
  }

  /**
   * Returns function that runs digest based on angular version.
   * @returns {function(...[*]=)}
   */
  function getDetectChangesFunc() {
    return () => {
      let result = 0x1F44D;
      const state = stateRef();
      try {
        if (isAngularIvy && ng.applyChanges) {
          // Angular 9+
          ng.applyChanges(updateComponentState(state));
        } else if (isAngular) {
          if (state.panelState.$debugInfo._debugInfo) {
            // Angular 2
            updateComponentState(state);
            state.panelState.$debugInfo._debugInfo._view.changeDetectorRef.detectChanges();
          } else if (ng.coreTokens) {
            // Angular 4+
            const ngZone = state.panelState.$debugInfo.injector.get(ng.coreTokens.NgZone);
            ngZone.run(() => {
              updateComponentState(state);
            });
          }
        } else if (isAngularJs && window.angular) {
          updateComponentState(state);
          angular.element($0).scope().$applyAsync();
        } else {
          console.error("Couldn't find change detection api.");
          result = 0x1F44E;
        }
      } catch (e) {
        console.error("Something went wrong. Couldn't run change detection.", e);
        result = 0x1F44E;
      }
      return String.fromCodePoint(result);
    }
  }

  /**
   * Compares previous and current panel state, if something is changed applies it to original state.
   * @param {State} scope
   * @returns {object}
   */
  function updateComponentState(scope) {
    Object.keys(scope.originalState).forEach((prop) => {
      if (scope.previousPanelState[prop] !== scope.panelState[prop]) {
        scope.previousPanelState[prop] = scope.panelState[prop];
        scope.originalState[prop] = scope.panelState[prop];
      }
    })
    return scope.originalState;
  }

  /**
   * Recursively searches the closest $ctrl property in scope.
   * @param {object} scope
   * @returns {string|object}
   */
  function findCtrl(scope) {
    if (scope && scope.$ctrl) {
      return scope.$ctrl;
    } else if (scope && scope.$parent) {
      return findCtrl(scope.$parent);
    } else {
      return '$ctrl is not found. Component or directive with controllerAs might not used in selected scope. ' +
          'See https://docs.angularjs.org/guide/component';
    }
  }

  /** @returns {State} */
  function stateRef() {
    return window.__ngState__;
  }

  /** Updates state reference. */
  function updateState(state) {
    window.__ngState__ = state;
  }

  /** Adds shortcuts to window object and prints help message to console. */
  function exportToWindow() {
    updateState(state);

    if (isAngularJs && !window.$ctrl) {
      Object.defineProperty(window, '$ctrl', {
        get() {
          return findCtrl(stateRef().originalState);
        }
      })
    }

    if (!window.$applyChanges) {
      window.$apply = window.$detectChanges = window.$applyChanges = getDetectChangesFunc();
    }

    if (!window.$state) {
      ['$state', '$scope', '$context'].forEach(method =>
        Object.defineProperty(window, method, {
          get() {
            return stateRef().originalState;
          }
        }));
    }

    if (window.__shortcutsShown__) return;
    console.log('\n\n');
    console.log('%cAngular state inspector shortcuts:', 'color: #ff5252; font-weight: bold;');
    if (isAngularJs) {
      console.log(`%c  $ctrl: %cComponent $ctrl property`, 'color: #ff5252;', 'color: #1976d2');
    }
    console.log(`%c  $state/$scope/$context: %cElement debug info`, 'color: #ff5252;', 'color: #1976d2');
    console.log(
      `%c  $apply/$applyChanges(): %cTrigger change detection cycle`,
      'color: #ff5252', 'color: #1976d2'
    );
    console.log('\n\n');
    window.__shortcutsShown__ = true;
  }

  function clone(object) {
    return Object.assign(Object.create(null), object);
  }
}
