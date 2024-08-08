#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Error: No argument provided. Please provide at least one argument."
    exit 1  
fi

first_arg=$1
source_dir="${first_arg%/}/Products/Applications"

if [ ! -d "$source_dir" ]; then
    echo "Error: Source directory does not exist."
    exit 1
fi


new_folder="Payload"
rm -rf $new_folder
mkdir $new_folder

cp -a $source_dir/* $new_folder

filename=$(find $new_folder -type d -name '*.app' -exec basename {} \; | head -n 1)
zip -rmq "${filename%.*}.ipa" $new_folder
