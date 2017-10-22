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
    } else if (angular) {
      panelContent = angular.element($0).scope();
    }
  }
  return panelContent;
}
