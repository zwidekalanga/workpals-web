"use client";

import { IconButton, Input, type InputProps } from "@chakra-ui/react";
import { forwardRef, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  function PasswordInput(props, ref) {
    const [show, setShow] = useState(false);

    return (
      <div style={{ position: "relative", width: "100%" }}>
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          pr="56px"
          pl="12px"
          py="16px"
          borderRadius="16px"
          h="52px"
          {...props}
        />
        <IconButton
          aria-label={show ? "Hide password" : "Show password"}
          variant="ghost"
          size="sm"
          onClick={() => setShow(!show)}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {show ? <LuEyeOff /> : <LuEye />}
        </IconButton>
      </div>
    );
  },
);
