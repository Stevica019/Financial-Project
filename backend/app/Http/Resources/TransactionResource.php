<?php

namespace App\Http\Resources;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id, 'account_name' => $this->account->name,
            'category_id' => $this->category_id, 'category_name' => $this->category->name,
            'type' => $this->type, 'amount' => Money::decimal($this->amount),
            'date' => $this->date->format('Y-m-d'),
            'description' => $this->description, 'notes' => $this->notes,
        ];
    }
}
