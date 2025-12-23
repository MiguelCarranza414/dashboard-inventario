from openpyxl import load_workbook
import json
from pathlib import Path

excel_path = r"C:\Users\Miguel.Carranza\OneDrive - Vertiv Co\Analisis Diciembre.xlsx"

# Dónde guardar los json (carpeta del script)
out_dir = Path(__file__).resolve().parent

READS = {
    "KPI.json":  ("JSON", "A16"),
    "apu1.json": ("APU1", "B21"),
    "apu2.json": ("APU2", "B21"),
    "apu3.json": ("APU3", "B22"),
}

def maybe_parse_json(value):
    # Si la celda trae un JSON como texto, lo convierte a dict/list
    if isinstance(value, str):
        s = value.strip()
        if s.startswith("{") or s.startswith("["):
            try:
                return json.loads(s)
            except json.JSONDecodeError:
                pass
    return value

wb = load_workbook(excel_path, data_only=True)

for filename, (sheet, cell) in READS.items():
    ws = wb[sheet]
    raw_value = ws[cell].value
    value = maybe_parse_json(raw_value)

    out_path = out_dir / filename
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)

    print(f"✅ {filename}: {sheet}!{cell} -> OK")
