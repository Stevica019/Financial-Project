<?php

namespace App\Models;

use App\Support\Money;
use Illuminate\Database\Eloquent\Model;

class SavingsGoal extends Model
{
    protected $fillable = ['name', 'target_amount', 'current_amount', 'target_date', 'description', 'status'];

    protected function casts(): array
    {
        return ['target_amount' => 'integer', 'current_amount' => 'integer'];
    }

    public function summary(): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'status' => $this->status,
            'target_amount' => Money::decimal($this->target_amount),
            'current_amount' => Money::decimal($this->current_amount),
            'remaining' => Money::decimal(max(0, $this->target_amount - $this->current_amount)),
            'percentage' => round($this->current_amount / $this->target_amount * 100, 1),
            'target_date' => $this->target_date, 'description' => $this->description,
        ];
    }
}
