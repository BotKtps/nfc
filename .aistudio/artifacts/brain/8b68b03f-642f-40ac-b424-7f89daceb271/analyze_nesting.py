
import re

def analyze_nesting(file_path):
    nesting_level = 0
    with open(file_path, 'r') as f:
        for i, line in enumerate(f):
            # This is a very simplified count, might miss nested div definitions or cases
            # like <divClassName="..."> which is actually common.
            # Using a more robust regex for opening tags:
            openings = len(re.findall(r'<div\b', line))
            closings = len(re.findall(r'</div>', line))
            nesting_level += openings - closings
            if nesting_level < 0:
                print(f"Error at line {i+1}: nesting level became {nesting_level}")
                return
    print(f"Final nesting level: {nesting_level}")

analyze_nesting('src/App.tsx')
