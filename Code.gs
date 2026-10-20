/* ============================================================
   Cocinería de Charly · Apps Script (Google Sheets Profesional)
   ------------------------------------------------------------
   Estructura limpia de 2 pestañas sin duplicados y con
   listas desplegables (selectores) aplicadas siempre.
   ============================================================ */

var SHEET_MENU = "Menú del Día";
var SHEET_AJUSTES = "Acompañamientos y Local";
var SPREADSHEET_ID = "1DIMwFTxCo5oRCb8mLW5qVllTk4kXftTEwLk9984BLSI";

/* ===================== 1) doGet · LEE el Excel para la Web ===================== */
function doGet() {
  try {
    return json_(buildMenu());
  } catch (err) {
    return json_({ error: String(err) }, 500);
  }
}

function buildMenu() {
  inicializarHojasYSelectores_();

  var ss = ss_();
  
  var ajSh = ss.getSheetByName(SHEET_AJUSTES);
  var restaurant = { name: "Cocinería de Charly", dayNote: "" };
  var maxAgregados = 2;
  var agregados = [];

  if (ajSh && ajSh.getLastRow() > 0) {
    var vals = ajSh.getDataRange().getValues();
    var leyendoAgr = false;

    for (var i = 0; i < vals.length; i++) {
      var row = vals[i];
      var col0 = String(row[0] || "").trim();
      var col1 = String(row[1] || "").trim();

      if (col0.includes("CONFIGURACIÓN")) continue;
      if (col0.includes("ACOMPAÑAMIENTOS")) { leyendoAgr = true; continue; }
      if (col0 === "Nombre del Local") { restaurant.name = col1 || restaurant.name; continue; }
      if (col0 === "Nota del Día (Banner)") { restaurant.dayNote = col1 || ""; continue; }
      if (col0 === "Máximo de Acompañamientos") { maxAgregados = Number(col1) || 2; continue; }

      if (leyendoAgr && col0 && col0 !== "Nombre del Acompañamiento") {
        var disponible = col1.includes("Disponible") || col1.toUpperCase() === "TRUE";
        agregados.push({
          id: "agr_" + slugify_(col0),
          nombre: col0,
          available: disponible
        });
      }
    }
  }

  var menuRows = getSheetData_(ss, SHEET_MENU);
  var catsMap = {}, catOrder = [];

  for (var k = 1; k < menuRows.length; k++) {
    var r = menuRows[k];
    var catNombre = String(r[0]).trim();
    var catPrecio = Number(r[1]) || 0;
    var platoNom  = String(r[2]).trim();
    var platoDesc = String(r[3]).trim();
    var tipoPlato = String(r[4]).trim();
    var estadoPlat= String(r[5]).trim();

    if (!catNombre) continue;

    var catId = "cat_" + slugify_(catNombre);
    if (!catsMap[catId]) {
      catsMap[catId] = { id: catId, nombre: catNombre, precio: catPrecio, icono: iconoPorCategoria_(catNombre), platos: [] };
      catOrder.push(catId);
    }

    if (platoNom) {
      var platoId = "pla_" + slugify_(platoNom);
      var isCerrado = tipoPlato.toLowerCase().includes("cerrada") || tipoPlato.toLowerCase().includes("preparado");
      var platoDisp = estadoPlat.includes("Disponible") || estadoPlat.toUpperCase() === "TRUE";

      catsMap[catId].platos.push({
        id: platoId,
        nombre: platoNom,
        desc: platoDesc,
        tipo: isCerrado ? "cerrado" : "con_agregado",
        available: platoDisp
      });
    }
  }

  return {
    restaurant: restaurant,
    inclusiones: [
      { id: "inc_ensalada", texto: "Ensalada mixta de entrada", emoji: "🥗" },
      { id: "inc_bebida",   texto: "Bebida gratis",             emoji: "🥤" }
    ],
    maxAgregados: maxAgregados,
    agregados: agregados,
    categories: catOrder.map(function(id){ return catsMap[id]; })
  };
}

/* ===================== 2) doPost · EL GARZÓN actualiza estados ===================== */
function doPost(e) {
  try {
    var body = parseBody_(e);
    var ADMIN_PIN = "1234";
    if (body && body.pin !== ADMIN_PIN) {
      return json_({ error: "PIN incorrecto" }, 403);
    }
    if (!body || body.action !== "guardar" || !body.menu) {
      return json_({ error: "Estructura inválida" }, 400);
    }
    
    var menu = body.menu;
    var ss = ss_();

    var menuSh = ss.getSheetByName(SHEET_MENU);
    if (menuSh && menuSh.getLastRow() > 1) {
      var data = menuSh.getDataRange().getValues();
      var updated = false;
      
      (menu.categories || []).forEach(function(c){
        (c.platos || []).forEach(function(p){
          var pIdBusq = "pla_" + slugify_(p.nombre);
          for (var i = 1; i < data.length; i++) {
            var filaPlatoNom = String(data[i][2]).trim();
            if ("pla_" + slugify_(filaPlatoNom) === pIdBusq) {
              data[i][5] = p.available ? "🟢 Disponible" : "🔴 Agotado";
              updated = true;
            }
          }
        });
      });
      
      if (updated) menuSh.getRange(1, 1, data.length, data[0].length).setValues(data);
    }

    var ajSh = ss.getSheetByName(SHEET_AJUSTES);
    if (ajSh && ajSh.getLastRow() > 1) {
      var ajData = ajSh.getDataRange().getValues();
      var ajUpdated = false;

      (menu.agregados || []).forEach(function(a){
        var aIdBusq = "agr_" + slugify_(a.nombre);
        for (var j = 0; j < ajData.length; j++) {
          var filaAgrNom = String(ajData[j][0]).trim();
          if ("agr_" + slugify_(filaAgrNom) === aIdBusq) {
            ajData[j][1] = a.available ? "🟢 Disponible" : "🔴 Agotado";
            ajUpdated = true;
          }
        }
      });

      if (ajUpdated) ajSh.getRange(1, 1, ajData.length, ajData[0].length).setValues(ajData);
    }

    return json_({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    return json_({ error: String(err) }, 500);
  }
}

/* ===================== 3) ESTRUCTURA Y SELECTORES AUTOMÁTICOS ===================== */
function inicializarHojasYSelectores_() {
  var ss = ss_();
  
  var oldSheets = ["Menu", "Globales", "Configuración del Local", "Acompañamientos"];
  oldSheets.forEach(function(name){
    var sh = ss.getSheetByName(name);
    if (sh && ss.getNumSheets() > 2) {
      if (ss.getSheetByName(SHEET_MENU) && ss.getSheetByName(SHEET_AJUSTES)) {
        try { ss.deleteSheet(sh); } catch(e){}
      }
    }
  });

  var menu = ss.getSheetByName(SHEET_MENU);
  if (!menu) {
    menu = ss.insertSheet(SHEET_MENU);
    menu.getRange(1, 1, 10, 6).setValues([
      ["Categoría", "Precio ($)", "Nombre del Plato", "Descripción", "Tipo de Plato", "Estado"],
      ["Menú Económico", 4800, "Carne mechada", "Jugosa y dorada al horno", "Con Acompañamiento (Hasta 2)", "🟢 Disponible"],
      ["Menú Económico", 4800, "Pollo al horno", "Condimentado con paprika", "Con Acompañamiento (Hasta 2)", "🟢 Disponible"],
      ["Menú Económico", 4800, "Porotos con riendas", "Preparación cerrada tradicional", "Preparación Cerrada (Sin agregados)", "🟢 Disponible"],
      ["Menú Ejecutivo", 5800, "Salmón a la plancha", "Al limón y finas hierbas", "Con Acompañamiento (Hasta 2)", "🟢 Disponible"],
      ["Menú Ejecutivo", 5800, "Milanesa de pollo", "Crujiente empanizado", "Con Acompañamiento (Hasta 2)", "🟢 Disponible"],
      ["Menú Ejecutivo", 5800, "Bistec a lo pobre", "Preparación cerrada con huevo y papas", "Preparación Cerrada (Sin agregados)", "🟢 Disponible"],
      ["Menú Premium", 7500, "Lomo saltado", "Lomo tierno salteado con cebolla y ají", "Preparación Cerrada (Sin agregados)", "🟢 Disponible"],
      ["Menú Premium", 7500, "Lomo a lo pobre", "El clásico chileno de la casa", "Preparación Cerrada (Sin agregados)", "🟢 Disponible"]
    ]);
  }
  var ruleEstadoPlato = SpreadsheetApp.newDataValidation().explicitValueList(["🟢 Disponible", "🔴 Agotado"]).build();
  var ruleTipoPlato   = SpreadsheetApp.newDataValidation().explicitValueList(["Con Acompañamiento (Hasta 2)", "Preparación Cerrada (Sin agregados)"]).build();
  menu.getRange("F2:F150").setDataValidation(ruleEstadoPlato);
  menu.getRange("E2:E150").setDataValidation(ruleTipoPlato);

  var aj = ss.getSheetByName(SHEET_AJUSTES);
  if (!aj) {
    aj = ss.insertSheet(SHEET_AJUSTES);
    aj.getRange(1, 1, 13, 2).setValues([
      ["=== CONFIGURACIÓN DEL LOCAL ===", ""],
      ["Nombre del Local", "Cocinería de Charly"],
      ["Nota del Día (Banner)", "¡Hoy: Lunes de cazuela y lomo saltado! 🍲"],
      ["Máximo de Acompañamientos", 2],
      ["", ""],
      ["=== ACOMPAÑAMIENTOS (AGREGADOS) ===", ""],
      ["Nombre del Acompañamiento", "Estado"],
      ["Puré", "🟢 Disponible"],
      ["Papas fritas", "🟢 Disponible"],
      ["Fideos", "🟢 Disponible"],
      ["Papas mayo", "🟢 Disponible"],
      ["Arroz", "🟢 Disponible"]
    ]);
  }
  var ruleEstadoAgr = SpreadsheetApp.newDataValidation().explicitValueList(["🟢 Disponible", "🔴 Agotado"]).build();
  aj.getRange("B8:B30").setDataValidation(ruleEstadoAgr);
}

/* ===================== 4) HELPERS ===================== */
function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetData_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  return sh.getLastRow() ? sh.getDataRange().getValues() : [];
}

function iconoPorCategoria_(nombre) {
  var n = String(nombre).toLowerCase();
  if (n.includes("econ") || n.includes("economico")) return "🥘";
  if (n.includes("ejec") || n.includes("ejecutivo")) return "🍽️";
  if (n.includes("prem") || n.includes("especial")) return "✨";
  return "🍴";
}

function slugify_(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseBody_(e) {
  try { return JSON.parse(e.postData.contents); }
  catch (err) { return null; }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
