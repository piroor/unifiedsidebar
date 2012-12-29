#!/bin/sh

appname=unifiedsidebar

cp buildscript/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

