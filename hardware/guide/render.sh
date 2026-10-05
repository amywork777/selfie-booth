#!/bin/bash
ALL="front left right bottom top deck ipad_holder back lock_bar rollo_standin labels_standin macbook_standin ipad_standin"
shot() { # out camera keep...
  out=$1; cam=$2; shift 2; keep=" $* "; args=()
  for p in $ALL; do [[ "$keep" == *" $p "* ]] || args+=(--hide "$p"); done
  .venv/bin/cadgen step snapshot STEP/box.step "$out" --camera "$cam" --width 900 --height 760 "${args[@]}" | tail -1
}
shot guide/1.png 335:22 front left right bottom
shot guide/2.png 335:22 front left right bottom deck
shot guide/3.png 335:22 front left right bottom deck top
shot guide/4.png 150:28 front left right bottom deck ipad_holder ipad_standin
shot guide/5.png 150:28 front left right bottom deck ipad_holder ipad_standin rollo_standin labels_standin macbook_standin
shot guide/6.png 150:20 front left right bottom deck top ipad_holder ipad_standin rollo_standin labels_standin macbook_standin back
shot guide/7.png 150:20 front left right bottom deck top ipad_holder ipad_standin rollo_standin labels_standin macbook_standin back lock_bar
shot guide/8.png 335:16 front left right bottom deck top ipad_holder ipad_standin rollo_standin labels_standin macbook_standin back lock_bar
for p in front back left right top bottom deck ipad_holder lock_bar; do
  .venv/bin/cadgen dxf snapshot DXF/box/$p.dxf guide/part_$p.png | tail -1
done
