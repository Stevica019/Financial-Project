<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class BcryptInput implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        // Prevent unsupported input and silent truncation at bcrypt's byte limit.
        if (strlen($value) > 72) {
            $fail('The password must not exceed 72 bytes.');
        }
        if (str_contains($value, "\0")) {
            $fail('The password contains an unsupported character.');
        }
    }
}
