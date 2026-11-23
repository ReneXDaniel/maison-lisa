"""Writes a locale's namespace files from a Python dict: python3 write.py <locale> <module>"""
import json, sys, importlib.util, os
locale, mod = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("m", mod); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
for ns, data in m.T.items():
    with open(os.path.join("messages", locale, f"{ns}.json"), "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")
print(f"wrote {len(m.T)} namespaces for {locale}")
