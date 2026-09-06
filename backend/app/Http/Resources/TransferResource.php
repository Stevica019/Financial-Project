<?php

namespace App\Http\Resources;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'kind' => 'transfer', 'type' => 'transfer',
            'source_account_id' => $this->source_account_id,
            'destination_account_id' => $this->destination_account_id,
            'source_account_name' => $this->sourceAccount->name,
            'destination_account_name' => $this->destinationAccount->name,
            'amount' => Money::decimal($this->amount), 'date' => $this->date->format('Y-m-d'),
            'description' => $this->description,
        ];
    }
}
