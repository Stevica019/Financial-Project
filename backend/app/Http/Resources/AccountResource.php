<?php

namespace App\Http\Resources;

use App\Services\AccountBalance;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'type' => $this->type,
            'opening_balance' => Money::decimal($this->opening_balance),
            'balance' => Money::decimal(AccountBalance::minor($this->resource)),
            'opening_date' => $this->opening_date->format('Y-m-d'),
            'description' => $this->description, 'is_active' => $this->is_active,
        ];
    }
}
