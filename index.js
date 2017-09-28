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
  let panelContent = {};
  if (ng && $0 && ng.probe($0)) {
    panelContent = ng.probe($0).componentInstance;
    console.log('test', ng.probe($0));
  }
  return panelContent;
}
