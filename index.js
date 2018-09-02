const panels = chrome && chrome.devtools && chrome.devtools.panels;
const elementsPanel = panels && panels.elements;

if (elementsPanel) {
  elementsPanel.createSidebarPane('State', sidebar => {
    elementsPanel.onSelectionChanged.addListener(() => sidebar.setExpression(`(${getPanelContents})()`));
  });
}

// The function below is executed in the context of the inspected page.
function getPanelContents() {
  const ng = window.ng;
  const angular = window.angular;
  let panelContent = Object.create(null);
  if ($0) {
    if (ng && ng.probe($0)) {
      panelContent = ng.probe($0).componentInstance;
      // Properties added with defineProperty are shown in a light red color
      if (ng.probe($0).context && Object.keys(ng.probe($0).context).length) {
        Object.defineProperty(panelContent, '__context', {value: ng.probe($0).context});
      }
      Object.defineProperty(panelContent, '__debugInfo', {value: ng.probe($0)});
    } else if (angular) {
      panelContent = angular.element($0).scope();
    }
  }
  return panelContent;
}
