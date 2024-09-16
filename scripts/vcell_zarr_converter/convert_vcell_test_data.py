"""
Python Script for Converting vcell test data into valid OME-ZARR
## CD into this directory
`cd scripts/vcell_zarr_converter`
## Activate preferred virtual environment
## Install dependencies:
`pip install zarr numpy bioio`
## Run: `python convert_vcell_test_data.py`
Input dir will default to ./vcelldata
Output dir will default to ./output/output.ome.zarr
"""

import os
import zarr
import numpy as np
import json
from bioio.writers.ome_zarr_writer_2 import OmeZarrWriter, compute_level_shapes, compute_level_chunk_sizes_zslice

def parse_metadata(metadata):
    # assumung 5d tczyx setting default values
    channel_names = [channel["label"] for channel in metadata["channels"]]
    physical_dims = {dim: 1.0 for dim in "xyzt"}
    physical_units = {dim: "micrometer" if dim != "t" else "minute" for dim in "xyzt"}
    scaling = [1.0, 1.0, 1.0, 1.0, 1.0]  # Default scaling for TCZYX

    for axis in metadata["axes"]:
        axis_name = axis["name"].lower()
        axis_index = "tczyx".index(axis_name)
        if axis["type"] == "space":
            physical_dims[axis_name] = axis.get("scale", 1.0)
            physical_units[axis_name] = axis.get("unit", physical_units[axis_name])
            scaling[axis_index] = axis.get("scale", 1.0)
        elif axis["type"] == "time":
            physical_dims["t"] = axis.get("scale", 1.0)
            physical_units["t"] = axis.get("unit", "second")
            time_steps = metadata.get("times", [])
            if len(time_steps) > 1:
                # assuming uniform time steps
                scaling[0] = time_steps[1] - time_steps[0]

    channel_colors = [int(color, 16) for color in ["FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF"]]
    return channel_names, physical_dims, physical_units, channel_colors, scaling

def convert_and_write_ome_zarr(input_path, output_path, image_name):
    with open(os.path.join(input_path, '.zattrs'), 'r') as file:
        metadata = json.load(file)["metadata"]

    channel_names, physical_scale, physical_units, channel_colors, scaling = parse_metadata(metadata)

    input_array = zarr.open(input_path, mode='r')[:].astype(np.float32)
    input_shape = input_array.shape
    num_levels = 1

    shapes = compute_level_shapes(input_shape, scaling, num_levels)
    chunk_sizes = compute_level_chunk_sizes_zslice(shapes)
    writer = OmeZarrWriter()
    writer.init_store(str(output_path), shapes, chunk_sizes, input_array.dtype)
    writer.write_t_batches_array(input_array, tbatch=4)

    meta = writer.generate_metadata(
        image_name=image_name,
        channel_names=channel_names,
        physical_dims=physical_scale,
        physical_units=physical_units,
        channel_colors=channel_colors
    )
    writer.write_metadata(meta)

    print(f"Conversion complete. OME-ZARR file is at {output_path}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_input_path = os.path.join(script_dir, "vcelldata")

    input_path = input(f"Enter the path to the input Zarr directory (default: {default_input_path}): ").strip() or default_input_path
    output_name = input("Enter a name for the output directory (ome.zarr extension will be applied automatically): ").strip() or "output"
    output_name = f"{output_name}.ome.zarr"

    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, output_name)

    print(f"Output will be saved to: {output_path}")

    image_name = input("Enter the image name (or press Enter to use default 'image'): ").strip() or "image"

    convert_and_write_ome_zarr(input_path, output_path, image_name)

if __name__ == "__main__":
    main()