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
  const ivyContext = getClosestIvyContext();
  let panelContent;

  if (ng && ng.probe && ng.probe($0)) { // Angular 2+
    panelContent = getAngularContent(ng);
  } else if (ivyContext) { // Angular ivy
    panelContent = getAngularIvyContent(ivyContext);
  } else if (window.angular) { // AngularJs
    panelContent = getAngularJsContent(window.angular);
  } else if (window.getAllAngularRootElements) {
    return 'Angular is running in production mode.';
  }
  exportToWindow(panelContent);

  return panelContent;

  function getAngularContent(ng) {
    const probe = ng.probe($0);
    const res = clone(probe.componentInstance);
    // Properties added with defineProperty are shown in a light red color
    if (probe.context && Object.keys(probe.context).length) {
      Object.defineProperty(res, '$context', {value: probe.context});
    }
    Object.defineProperty(res, '$debugInfo', {value: probe});

    return res;
  }

  function getClosestIvyContext() {
    let el = $0;
    while (!el.__ngContext__) {
      el = el.parentNode;
      if (!el) break;
    }
    return el;
  }

  function getAngularIvyContent(el) {
    // TODO: ng and ng.probe were removed in ivy, wait for the official public dev api.
    return el ? clone(el.__ngContext__.debug.context) : Object.create(null);
  }

  function getAngularJsContent(angular) {
    return clone(angular.element($0).scope());
  }

  function getDetectChanges(panelContent) {
    return () => {
      if (window.angular) {
        try {
          angular.element($0).scope().$applyAsync();
        } catch (e) {
          console.error("Something went wrong. Couldn't run digest.", e);
        }
      } else if (panelContent.$debugInfo) {
        panelContent.$debugInfo._debugInfo._view.changeDetectorRef.detectChanges();
      } else {
        console.error("Couldn't find change detection api.");
      }
    }
  }

  function exportToWindow(scope) {
    window.$scope = window.$context = scope;
    window.$detectChanges = window.$tick = window.$apply = getDetectChanges(scope);

    if (window.__shortcutsShown__) return;
    console.log('\n\n');
    console.log('%cAngular state inspector shortcuts:', 'color: #ff5252; font-weight: bold;');
    console.log(`%c  $scope/$context: %cElement debug info`, 'color: #ff5252; font-weight: bold;', 'color: #1976d2');
    console.log(`%c  $getDetectChanges()/$tick()/$apply(): %cTrigger change detection cycle`, 'color: #ff5252', 'color: #1976d2');
    console.log('\n\n');
    window.__shortcutsShown__ = true;
  }

  function clone(object) {
    return Object.assign(Object.create(null), object);
  }
}
