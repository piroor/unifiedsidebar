#!/bin/sh

appname=unifiedsidebar

cp makexpi/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

