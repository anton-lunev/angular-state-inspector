const panels = chrome && chrome.devtools && chrome.devtools.panels;
const elementsPanel = panels && panels.elements;

if (elementsPanel) {
  elementsPanel.createSidebarPane('State', sidebar => {
    elementsPanel.onSelectionChanged.addListener(() => sidebar.setExpression(`(${getPanelContents})()`));
  });
}

// The function below is executed in the context of the inspected page.
function getPanelContents() {
  if (!$0) return;
  const ng = window.ng;
  let isAngular = false;
  let isAngularJs = false;
  let isAngularIvy = false;

  const panelContent = getPanelContent();

  if (panelContent) {
    exportToWindow(panelContent);
  } else {
    return 'Cannot retrieve angular state';
  }

  return panelContent;


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

  function getAngularContent(ng) {
    const probe = ng.probe($0);
    const res = clone(probe.componentInstance);
    addStateProp(res, '$context', probe.context);
    addStateProp(res, '$debugInfo', probe);

    return res;
  }

  function getAngularIvyContent() {
    let el = $0;
    const res = clone(ng.getOwningComponent(el) || ng.getComponent(el));
    addStateProp(res, '$context', ng.getContext(el));
    addStateProp(res, '$directives', ng.getDirectives(el));
    addStateProp(res, '$listeners', ng.getListeners(el));

    return res;
  }

  function addStateProp(state, name, value) {
    if (value && Object.keys(value).length) {
      // Properties added with defineProperty are shown in a light red color
      Object.defineProperty(state, name, {value, enumerable: false});
    }
  }

  function getAngularJsContent(angular) {
    return clone(angular.element($0).scope());
  }

  function getDetectChanges(panelContent) {
    return () => {
      if (isAngularIvy && ng.applyChanges) {
        // Angular 9+
        ng.applyChanges(ng.getOwningComponent($0) || ng.getComponent($0));
      } else if (isAngular && panelContent.$debugInfo._debugInfo) {
        // Angular 2
        panelContent.$debugInfo._debugInfo._view.changeDetectorRef.detectChanges();
      } else if (isAngular && ng.coreTokens) {
        // Angular 4+
        const ngZone = panelContent.$debugInfo.injector.get(ng.coreTokens.NgZone);
        ngZone.run(() => {
          updateComponentState(panelContent);
        });
      } else if (isAngularJs && window.angular) {
        try {
          angular.element($0).scope().$applyAsync();
        } catch (e) {
          console.error("Something went wrong. Couldn't run change detection.", e);
        }
      } else {
        console.error("Couldn't find change detection api.");
      }
    }
  }

  function updateComponentState(scope) {
    Object.keys(scope).forEach((prop) => {
      if (scope[prop] !== scope.$context[prop]) {
        scope.$context[prop] = scope[prop];
      }
    })
  }

  function findCtrl(scope) {
    if (scope && scope.$ctrl) {
      return scope.$ctrl;
    } else if (scope && scope.$parent) {
      return findCtrl(scope.$parent);
    } else {
      return null;
    }
  }

  function exportToWindow(scope) {
    if (isAngularJs) {
      window.$ctrl = findCtrl(scope);
    }

    ['$state', '$scope', '$context'].forEach(method =>
      Object.defineProperty(window, method, {
        get() {
          return getPanelContent();
        }
      }));
    window.$apply = window.$detectChanges = window.$applyChanges = getDetectChanges(scope);

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
