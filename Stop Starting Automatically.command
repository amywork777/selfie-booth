#!/bin/bash
# Double-click to stop the booth starting by itself. Start Booth still works as usual.
LABEL="com.selfiebooth.server"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "The booth won't start by itself any more. Double-click Start Booth to run it."
echo
read -n 1 -s -r -p "Press any key to close this window."
