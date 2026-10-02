#!/usr/bin/env bash
# Builds every tagged version of the lantern into deploy/<tag>/ and writes a
# root index.html with a version switcher. Usage: scripts/build-versions.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"; git -C "$ROOT" worktree prune' EXIT

rm -rf "$OUT"
mkdir -p "$OUT"

TAGS=($(git -C "$ROOT" tag --list 'v*' | sort -V))
for tag in "${TAGS[@]}"; do
  git -C "$ROOT" worktree add -q "$TMP/$tag" "$tag"
  ln -s "$ROOT/node_modules" "$TMP/$tag/node_modules"
  npx --prefix "$TMP/$tag" vite build "$TMP/$tag" --base "/$tag/" --outDir "$OUT/$tag" --emptyOutDir
  git -C "$ROOT" worktree remove --force "$TMP/$tag"
done

LAST="${TAGS[${#TAGS[@]}-1]}"
BUTTONS=""
for tag in "${TAGS[@]}"; do
  BUTTONS+="<button data-v=\"$tag\">$tag</button>"
done

cat > "$OUT/index.html" <<EOF
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Procedural lantern</title>
<style>
  html, body { margin: 0; height: 100%; background: #15151a; font: 14px system-ui, sans-serif; }
  nav { position: fixed; top: 12px; left: 12px; display: flex; gap: 6px; z-index: 1; }
  button { padding: 6px 14px; border: 1px solid #555; border-radius: 6px; background: #222; color: #ddd; cursor: pointer; }
  button.active { background: #c4a265; color: #111; border-color: #c4a265; }
  iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
<nav>$BUTTONS</nav>
<iframe id="frame" title="lantern"></iframe>
<script>
  const buttons = [...document.querySelectorAll('nav button')];
  const frame = document.getElementById('frame');
  function show(v) {
    frame.src = '/' + v + '/';
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.v === v));
    history.replaceState(null, '', '#' + v);
  }
  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.v)));
  const wanted = location.hash.slice(1);
  show(buttons.some((b) => b.dataset.v === wanted) ? wanted : '$LAST');
</script>
</body>
</html>
EOF

echo "built: ${TAGS[*]} -> $OUT"
