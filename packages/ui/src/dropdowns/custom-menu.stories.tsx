import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CustomMenu } from "./custom-menu";

const meta = {
  title: "Components/Dropdowns/CustomMenu",
  component: CustomMenu,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CustomMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function InteractionHarness() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("None");

  return (
    <div className="flex h-64 w-[32rem] items-start justify-between overflow-hidden p-8">
      {["First", "Second"].map((name) => (
        <CustomMenu key={name} label={`${name} menu`} placement="bottom-start">
          <CustomMenu.SubMenu trigger="Priority" contentClassName="w-52 p-2">
            <input
              aria-label={`${name} submenu search`}
              className="mb-2 w-full rounded-sm border border-strong px-2 py-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {["Urgent", "High", "Medium", "Low"].map((priority) => (
              <CustomMenu.MenuItem key={priority} onClick={() => setSelected(`${name}: ${priority}`)}>
                {priority}
              </CustomMenu.MenuItem>
            ))}
          </CustomMenu.SubMenu>
        </CustomMenu>
      ))}
      <output aria-live="polite" className="absolute bottom-8 left-8">
        Query: {query || "empty"}; Selected: {selected}
      </output>
    </div>
  );
}

export const NestedInteractions: Story = {
  args: { children: null },
  render: () => <InteractionHarness />,
};
