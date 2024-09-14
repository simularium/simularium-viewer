import os
import zarr
import numpy as np
import json
from bioio.writers.ome_zarr_writer_2 import OmeZarrWriter, compute_level_shapes, compute_level_chunk_sizes_zslice

def parse_metadata(metadata):
    channel_names = [channel["label"] for channel in metadata["channels"]]
    
    # Initialize defaults for dimensions and units
    physical_dims = {"x": 1.0, "y": 1.0, "z": 1.0, "t": 1.0}  # Default scale for each dimension
    physical_units = {"x": "micrometer", "y": "micrometer", "z": "micrometer", "t": "minute"}  # Default units
    
    # Extract the physical units and scale from axes (X, Y, Z)
    for axis in metadata["axes"]:
        if axis["type"] == "space":  # X, Y, Z axes are marked as space
            axis_name = axis["name"].lower()  # incoming vcell data is lowercase, just in case...
            physical_dims[axis_name] = axis.get("scale", 1.0)  # again, just in case, incoming data does not have scale
            physical_units[axis_name] = axis.get("unit", physical_units[axis_name])  # Use unit if available
        elif axis["type"] == "time":  # Time axis
            physical_dims["t"] = axis.get("scale", 1.0)
            physical_units["t"] = axis.get("unit", "second")  # Default to 'second' for time units
    
    # If physical units for space axes are missing, prompt for input
    for dim in ["x", "y", "z"]:
        if physical_units[dim] is None:
            physical_units[dim] = input(f"Enter the physical units for {dim} (e.g., microns): ").strip()
    
    # Create a list of default colors for the channels
    default_colors = ["FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF"]
    channel_colors = [int(color, 16) for color in default_colors] # typing in docs showed str could work but i got errors unless providing int
    return channel_names, physical_dims, physical_units, channel_colors

def convert_zarr_to_numpy(input_path):
    # Read the zarr and convert to float32 np array
    input_array = zarr.open(input_path, mode='r')
    float_array = input_array[:].astype(np.float32)
    return float_array

def write_ome_zarr_with_bioio(input_array, output_path, image_name, parsed_metadata):
    # current data from vcell is one level of resolution
    input_shape = input_array.shape # Get the shape of the input array (assumed to be 5D TCZYX)
    scaling = [0.25, 1, 1, 1, 1]  # todo: how to get scaling from incoming data?
    num_levels = 1  # How to get this from incoming data?
    
    # documentation: https://github.com/bioio-devs/bioio/blob/main/bioio/writers/ome_zarr_writer_2.py#L355
    shapes = compute_level_shapes(input_shape, scaling, num_levels)
    chunk_sizes = compute_level_chunk_sizes_zslice(shapes)
    writer = OmeZarrWriter()
    writer.init_store(str(output_path), shapes, chunk_sizes, input_array.dtype)
    writer.write_t_batches_array(input_array, tbatch=4)
    channel_names, physical_scale, physical_units, channel_colors = parsed_metadata
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
    # Get the current script directory and set the default input path to vcelldata folder
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_input_path = os.path.join(script_dir, "vcelldata")

    # Prompt the user for input path, or use the default vcelldata path
    input_path = input(f"Enter the path to the input Zarr directory (default: {default_input_path}): ").strip() or default_input_path
    
    # Prompt the user for output directory name, and default to 'output.ome.zarr'
    output_name = input("Enter a name for the output directory (ome.zarr extension will be applied automatically): ").strip() or "output"
    output_name = f"{output_name}.ome.zarr"
    
    # Set default output path to 'output/' and make sure the directory exists
    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Create the full output path inside 'output/' directory
    output_path = os.path.join(output_dir, output_name)
    
    print(f"Output will be saved to: {output_path}")

    # Read metadata from the input .zattrs file
    with open(os.path.join(input_path, '.zattrs'), 'r') as f:
        metadata = json.load(f)["metadata"]

    # Parse incoming Zarr metadata for channel names, physical scale, and units
    parsed_metadata = parse_metadata(metadata)

    # Prompt for image name, or default to 'image'
    image_name = input("Enter the image name (or press Enter to use default 'image'): ").strip() or "image"

    # Convert Zarr data to int32 NumPy array
    float_array = convert_zarr_to_numpy(input_path)
    
    # Call the BioIO writer to write the converted array
    write_ome_zarr_with_bioio(float_array, output_path, image_name, parsed_metadata)

if __name__ == "__main__":
    main()
