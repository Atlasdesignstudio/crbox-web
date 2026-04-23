#!/bin/bash
set -e

# Static HTML/CSS/JS site — no build step, no dependencies to install.
# This script exists to satisfy the post-merge hook requirement.
echo "Post-merge setup complete (static site, nothing to build)."
