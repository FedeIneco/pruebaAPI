import {
  Server,
  BIMViewer,
  LocaleService,
  addObserver,
  agregarObservador,
  array,
} from "../lib/xeokit-bim-viewer/xeokit-bim-viewer.es.js";

import { messages as localeMessages } from "../lib/xeokit-bim-viewer/messages.js";

const formData = new FormData();
const boton = document.getElementById("boton");
const form = document.getElementById("myForm");
const lista = document.getElementById("listado");
const excelInput = document.getElementById("fileInput");

form.style.display =
  window.location.href === "http://localhost:3000/" ? "block" : "none";
lista.style.display =
  window.location.href === "http://localhost:3000/" ? "flex" : "none";

boton.addEventListener("click", enviar);
function enviar() {
  const texto = document.getElementById("texto").value;
  const archivos = document.getElementById("archivo").files;
  for (let i = 0; i < archivos.length; i++) {
    formData.append("archivo", archivos[i]);
  }
  formData.append("texto", texto);
  fetch("http://localhost:3000/api/convert-to-xkt", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error en la petición");
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error(error);
    });
}

const listado = document.getElementById("menuListado");
function archivosCreados() {
  fetch("http://localhost:3000/api/projects")
    .then((response) => response.json())
    .then((data) => {
      const filenames = data.filenames;
      filenames.forEach((filename) => {
        // Crear un elemento li
        const li = document.createElement("li");

        // Configurar el texto del elemento li
        li.innerHTML = `<a href="http://localhost:3000/?projectId=${filename}">${filename}</a>`;

        // Agregar el elemento li a la lista
        listado.appendChild(li);
      });
    })
    .catch((error) => console.error(error));
}
archivosCreados();


let todasTablaseditadas = document.createElement("table");
const exportButton = document.getElementById("export-btn");
const saveButton = document.getElementById("save-btn");

saveButton.onclick = () => {
  alert("Propiedad guardada con éxito");
  const tables = document.querySelectorAll(".xeokit-table");
  for (let i = 0; i < tables.length; i++) {
    todasTablaseditadas.insertAdjacentHTML(
      "beforeend",
      tables[i].children[0].innerHTML
    );
  }
};
exportButton.onclick = () => {
  const book = XLSX.utils.table_to_book(todasTablaseditadas);
  XLSX.writeFile(book, "Propiedades.xlsx");
};
window.onload = function () {
  const requestParams = getRequestParams();
  const locale = requestParams.locale || "en";
  const projectId = requestParams.projectId;

  if (!projectId) {
    return;
  }

  const openExplorer = requestParams.openExplorer;
  setExplorerOpen(openExplorer === "true");

  const enableEditModels = requestParams.enableEditModels === "true";

  const server = new Server({
    dataDir: "./data",
  });

  const bimViewer = new BIMViewer(server, {
    localeService: new LocaleService({
      messages: localeMessages,
      locale: locale,
    }),
    canvasElement: document.getElementById("myCanvas"), // WebGL canvas
    explorerElement: document.getElementById("myExplorer"), // Left panel
    toolbarElement: document.getElementById("myToolbar"), // Toolbar
    inspectorElement: document.getElementById("myInspector"), // Right panel
    navCubeCanvasElement: document.getElementById("myNavCubeCanvas"),
    busyModelBackdropElement: document.getElementById("myViewer"),
    enableEditModels: enableEditModels,
  });

  bimViewer.localeService.on("updated", () => {
    const localizedElements = document.querySelectorAll(".xeokit-i18n");
    localizedElements.forEach((localizedElement) => {
      if (localizedElement.dataset.xeokitI18n) {
        localizedElement.innerText = bimViewer.localeService.translate(
          localizedElement.dataset.xeokitI18n
        );
      }
      if (localizedElement.dataset.xeokitI18ntip) {
        const translation = bimViewer.localeService.translate(
          localizedElement.dataset.xeokitI18ntip
        );
        if (translation) {
          localizedElement.dataset.tippyContent =
            bimViewer.localeService.translate(
              localizedElement.dataset.xeokitI18ntip
            );
        }
      }
      if (localizedElement.dataset.tippyContent) {
        if (localizedElement._tippy) {
          localizedElement._tippy.setContent(
            localizedElement.dataset.tippyContent
          );
        } else {
          tippy(localizedElement, {
            appendTo: "parent",
            zIndex: 1000000,
            allowHTML: true,
          });
        }
      }
    });
  });

  bimViewer.setConfigs({});

  bimViewer.on("openExplorer", () => {
    setExplorerOpen(true);
  });

  bimViewer.on("openInspector", () => {
    setInspectorOpen(true);
  });

  bimViewer.on("addModel", (event) => {
    // "Add" selected in Models tab's context menu
    console.log("addModel: " + JSON.stringify(event, null, "\t"));
  });

  bimViewer.on("editModel", (event) => {
    // "Edit" selected in Models tab's context menu
    console.log("editModel: " + JSON.stringify(event, null, "\t"));
  });

  bimViewer.on("deleteModel", (event) => {
    // "Delete" selected in Models tab's context menu
    console.log("deleteModel: " + JSON.stringify(event, null, "\t"));
  });

  const viewerConfigs = requestParams.configs;
  if (viewerConfigs) {
    const configNameVals = viewerConfigs.split(",");
    for (let i = 0, len = configNameVals.length; i < len; i++) {
      const configNameValStr = configNameVals[i];
      const configNameVal = configNameValStr.split(":");
      const configName = configNameVal[0];
      const configVal = configNameVal[1];
      bimViewer.setConfig(configName, configVal);
    }
  }

  bimViewer.loadProject(
    projectId,
    () => {
      const modelId = requestParams.modelId;
      if (modelId) {
        bimViewer.loadModel(modelId);
      }
      const tab = requestParams.tab;
      if (tab) {
        bimViewer.openTab(tab);
      }
      watchHashParams();
    },
    (errorMsg) => {
      console.error(errorMsg);
    }
  );

  function watchHashParams() {
    let lastHash = "";
    window.setInterval(() => {
      const currentHash = window.location.hash;
      if (currentHash !== lastHash) {
        parseHashParams();
        lastHash = currentHash;
      }
    }, 400);
  }

  function parseHashParams() {
    const params = getHashParams();
    const actionsStr = params.actions;
    if (!actionsStr) {
      return;
    }
    const actions = actionsStr.split(",");
    if (actions.length === 0) {
      return;
    }
    for (let i = 0, len = actions.length; i < len; i++) {
      const action = actions[i];
      switch (action) {
        case "focusObject":
          const objectId = params.objectId;
          if (!objectId) {
            console.error(
              "Param expected for `focusObject` action: 'objectId'"
            );
            break;
          }
          bimViewer.setAllObjectsSelected(false);
          bimViewer.setObjectsSelected([objectId], true);
          bimViewer.flyToObject(objectId, () => {
            // FIXME: Showing objects in tabs involves scrolling the HTML within the tabs - disable until we know how to scroll the correct DOM element. Otherwise, that function works OK
            // bimViewer.showObjectInObjectsTab(objectId);
            // bimViewer.showObjectInClassesTab(objectId);
            // bimViewer.showObjectInStoreysTab(objectId);
          });
          break;
        case "focusObjects":
          const objectIds = params.objectIds;
          if (!objectIds) {
            console.error(
              "Param expected for `focusObjects` action: 'objectIds'"
            );
            break;
          }
          const objectIdArray = objectIds.split(",");
          bimViewer.setAllObjectsSelected(false);
          bimViewer.setObjectsSelected(objectIdArray, true);
          bimViewer.viewFitObjects(objectIdArray, () => {});
          break;
        case "clearFocusObjects":
          bimViewer.setAllObjectsSelected(false);
          bimViewer.viewFitAll();
          // TODO: view fit nothing?
          break;
        case "openTab":
          const tabId = params.tabId;
          if (!tabId) {
            console.error("Param expected for `openTab` action: 'tabId'");
            break;
          }
          bimViewer.openTab(tabId);
          break;
        default:
          console.error("Action not supported: '" + action + "'");
          break;
      }
    }
  }

  function setExplorerOpen(explorerOpen) {
    const toggle = document.getElementById("explorer_toggle");
    if (toggle) {
      toggle.checked = explorerOpen;
    }
  }

  function setInspectorOpen(inspectorOpen) {
    const toggle = document.getElementById("inspector_toggle");
    if (toggle) {
      toggle.checked = inspectorOpen;
    }
  }

  function getRequestParams() {
    const vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m, key, value) => {
      vars[key] = value;
    });
    return vars;
  }

  function getHashParams() {
    const hashParams = {};
    let e;
    const a = /\+/g; // Regex for replacing addition symbol with a space
    const r = /([^&;=]+)=?([^&;]*)/g;
    const d = function (s) {
      return decodeURIComponent(s.replace(a, " "));
    };
    const q = window.location.hash.substring(1);
    while ((e = r.exec(q))) {
      hashParams[d(e[1])] = d(e[2]);
    }
    return hashParams;
  }

  let mostrarSeleccion = (datos) => {
    return datos;
  };

  addObserver(mostrarSeleccion);

  function mostrarChecks(checks) {
    const datos = mostrarSeleccion(array);
    for (let i = 0; i < checks.length; i++) {
      bimViewer.setObjectsSelected(datos[i].ids, false);
      checks[i].addEventListener("change", (event) => {
        if (event.target.checked && checks[i].id == datos[i].nombre) {
          bimViewer.setObjectsSelected(datos[i].ids, true);          
          bimViewer.viewFitObjects(datos[i].ids);
        } else {
          bimViewer.setObjectsSelected(datos[i].ids, false);
        }
      });
    }
  }

  agregarObservador(mostrarChecks);




  window.bimViewer = bimViewer; // For debugging
};
