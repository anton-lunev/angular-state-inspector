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
  let panelContent;

  if (ng && ng.probe && ng.probe($0)) { // Angular 2+
    panelContent = getAngularContent(ng);
  } else if (ng && !ng.probe) { // Angular ivy
    panelContent = getAngularIvyContent(ng);
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

  function getAngularIvyContent(ng) {
    let el = $0;
    while (!el.__ngContext__) el = $0.parentNode;
    if (!ng.getContext && el && !window.ivyWarningShown) {
      console.info("Public debug api is not enabled in Ivy yet. To enable it manually import {publishDefaultGlobalUtils} from '@angular/core' and invoke it in dev mode.");
      window.__ivyWarningShown__ = true;
    }
    if (el) return clone(el.__ngContext__.debug.context);
  }

  function getAngularJsContent(angular) {
    return clone(angular.element($0).scope());
  }

  function getDetectChanges(panelContent) {
    if (!panelContent.$debugInfo) return;
    return () => panelContent.$debugInfo._debugInfo._view.changeDetectorRef.detectChanges();
  }

  function exportToWindow(scope) {
    window.$scope = window.$context = scope;
    window.$detectChanges = window.$tick = getDetectChanges(scope);

    if (window.__shortcutsShown__) return;
    console.log('\n\n');
    console.log('%cAngular state inspector shortcuts:', 'color: #ff5252; font-weight: bold;');
    console.log(`%c  $scope/$context: %cElement debug info`, 'color: #ff5252; font-weight: bold;', 'color: #1976d2');
    if (window.$detectChanges) {
      console.log(`%c  $getDetectChanges()/$tick(): %cTrigger change detection cycle`, 'color: #ff5252', 'color: #1976d2');
    }
    console.log('\n\n');
    window.__shortcutsShown__ = true;
  }

  function clone(object) {
    return Object.assign(Object.create(null), object);
  }
}
