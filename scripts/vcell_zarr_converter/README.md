# Python Script for Converting vcell sim data into OME-ZARR

## Prerequisites
- Python 3.10 and virtual environment of your choice

## CD into this directory
`cd scripts/vcell_zarr_converter`

## Setting up a python virtual environment the way you prefer, or:

1. Install `virtualenv` if you don't have it:
   `pip install virtualenv`

2. Create a virtual environment:
   `virtualenv venv`

3. Activate the virtual environment:
   - On macOS/Linux:
     `source venv/bin/activate`
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
## Install dependencies:
`pip install zarr numpy bioio`

## Running the Script
Input dir will default to /vcelldata, and output will default to /output/ouput.ome.zarr
`python convertvcellzarrbioio.py`